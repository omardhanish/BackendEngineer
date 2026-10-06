// DeepSeek client: OpenAI-compatible /chat/completions over SSE, built for Node 20 (fetch + web streams).
// Retries only before the first byte; after that, partial output is the caller's to keep.
import { setTimeout as sleep } from 'node:timers/promises';

export class DeepSeekError extends Error {
  constructor(message, { status = 0, code = 'upstream', retryable = false, retryAfterMs = 0 } = {}) {
    super(message);
    this.name = 'DeepSeekError';
    Object.assign(this, { status, code, retryable, retryAfterMs });
  }
}
/** Thrown (as the abort reason) when the browser tab went away or pressed Stop. */
export class ClientGone extends Error {
  constructor() {
    super('client disconnected');
    this.name = 'ClientGone';
  }
}

const jitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));

function classify(status) {
  if (status === 401) return { code: 'key_invalid', retryable: false, message: 'DeepSeek rejected the API key (401). Check DEEPSEEK_API_KEY in .env.' };
  if (status === 402) return { code: 'balance_empty', retryable: false, message: 'The DeepSeek account has no balance left (402).' };
  if (status === 429) return { code: 'rate_limited', retryable: true, message: 'DeepSeek is rate-limiting requests (429). Try again in a moment.' };
  if (status === 400 || status === 422) return { code: 'bad_request', retryable: false, message: `DeepSeek could not accept the request (${status}).` };
  if (status >= 500) return { code: 'upstream', retryable: true, message: `DeepSeek had a server problem (${status}).` };
  return { code: 'upstream', retryable: false, message: `Unexpected DeepSeek response (${status}).` };
}

async function toError(res) {
  const c = classify(res.status);
  let detail = '';
  try {
    const text = await res.text();
    try { detail = JSON.parse(text)?.error?.message || ''; } catch { detail = text.slice(0, 200); }
  } catch { /* ignore */ }
  if (res.status === 401 || res.status === 402) detail = ''; // the friendly message says it all; do not echo upstream text
  const ra = Number(res.headers.get('retry-after'));
  return new DeepSeekError(detail ? `${c.message} ${detail}`.slice(0, 400) : c.message, {
    status: res.status, code: c.code, retryable: c.retryable, retryAfterMs: Number.isFinite(ra) && ra > 0 ? Math.min(ra, 10) * 1000 : 0,
  });
}

export function createDeepSeek({ baseUrl, key, model, limits, fetchImpl = globalThis.fetch }) {
  const headers = () => ({ authorization: `Bearer ${key}`, 'content-type': 'application/json' });

  /** Which models does this key see? Used at boot and by /api/health. */
  async function checkModels() {
    if (!key) return { ok: false, error: 'no API key configured', models: [] };
    try {
      const res = await fetchImpl(`${baseUrl}/models`, { headers: headers(), signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { ok: false, error: classify(res.status).message, models: [] };
      const j = await res.json();
      const models = (j.data || []).map((m) => m.id);
      return { ok: models.includes(model), models, error: models.includes(model) ? null : `model "${model}" is not offered; available: ${models.join(', ') || 'none'}` };
    } catch (e) {
      return { ok: false, error: `could not reach DeepSeek (${e.name})`, models: [] };
    }
  }

  /**
   * Async generator of {type:'delta'|'done', ...}. Throws DeepSeekError / ClientGone.
   * `signal` aborts the upstream request (client left or server shutting down).
   */
  async function* stream({ messages, temperature = 0.5, maxTokens = limits.maxTokens, signal, onStatus }) {
    const body = {
      model, messages, stream: true, stream_options: { include_usage: true },
      max_tokens: maxTokens, temperature,
      thinking: { type: 'disabled' }, // thinking is ON by default upstream; tutoring wants fast, direct answers
    };
    const backoff = [800, 2400];
    for (let attempt = 0; ; attempt++) {
      const inner = new AbortController();
      const sig = AbortSignal.any([signal, inner.signal, AbortSignal.timeout(limits.totalMs)]);
      let res;
      try {
        res = await fetchImpl(`${baseUrl}/chat/completions`, { method: 'POST', headers: { ...headers(), accept: 'text/event-stream' }, body: JSON.stringify(body), signal: sig });
      } catch (e) {
        if (signal.aborted) throw signal.reason ?? e;
        if (attempt < backoff.length) { onStatus?.({ retrying: attempt + 1 }); await sleep(jitter(backoff[attempt]), undefined, { signal }); continue; }
        throw new DeepSeekError('Could not reach DeepSeek. Check your internet connection.', { code: 'network', retryable: true });
      }
      if (!res.ok) {
        const err = await toError(res);
        if (err.retryable && attempt < backoff.length) {
          onStatus?.({ retrying: attempt + 1, reason: err.code });
          await sleep(err.retryAfterMs || jitter(backoff[attempt]), undefined, { signal });
          continue;
        }
        throw err;
      }
      yield* read(res, { signal, inner });
      return;
    }
  }

  async function* read(res, { signal, inner }) {
    const reader = res.body.getReader();
    const dec = new TextDecoder('utf-8');
    let buf = '';
    let gotDelta = false;
    let finish = null;
    let usage = null;
    let timer;
    const arm = () => {
      clearTimeout(timer);
      const ms = gotDelta ? limits.idleMs : limits.firstDeltaMs;
      timer = setTimeout(() => inner.abort(new DeepSeekError(gotDelta ? 'DeepSeek stopped responding mid-answer.' : 'DeepSeek took too long to start answering.', { code: 'timeout', retryable: true })), ms);
    };
    arm();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        arm();
        buf += dec.decode(value, { stream: true });
        let m;
        while ((m = /\r?\n\r?\n/.exec(buf))) {
          const frame = buf.slice(0, m.index);
          buf = buf.slice(m.index + m[0].length);
          for (const line of frame.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue; // ": keep-alive" comments and other fields
            const data = line.slice(5).trim();
            if (data === '[DONE]') { yield { type: 'done', finish_reason: finish, usage }; return; }
            let j;
            try { j = JSON.parse(data); } catch { continue; }
            if (j.usage) usage = j.usage;
            const choice = j.choices?.[0];
            if (!choice) continue;
            if (choice.finish_reason) finish = choice.finish_reason;
            const text = choice.delta?.content;
            if (text) { gotDelta = true; yield { type: 'delta', text }; }
          }
        }
      }
      yield { type: 'done', finish_reason: finish, usage };
    } catch (e) {
      if (inner.signal.aborted && inner.signal.reason instanceof DeepSeekError) throw inner.signal.reason;
      if (signal.aborted) throw signal.reason ?? e;
      if (e instanceof DeepSeekError || e instanceof ClientGone) throw e;
      throw new DeepSeekError('The connection to DeepSeek dropped mid-answer.', { code: 'network', retryable: true });
    } finally {
      clearTimeout(timer);
      reader.cancel().catch(() => {});
    }
  }

  return { stream, checkModels, model };
}
