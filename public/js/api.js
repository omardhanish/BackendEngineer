// Thin fetch layer. Same-origin only; JSON in, JSON out; SSE for the tutor.
// Everything about a page goes to the CURRENT book's endpoints (/api/books/<slug>/…); `slug` overrides it.
import { paths } from './paths.js';

export class ApiError extends Error {
  constructor(message, status = 0, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(method, url, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('Cannot reach the local server. Is `npm start` still running?', 0, 'offline');
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json().catch(() => null) : null;
  if (!res.ok) throw Object.assign(new ApiError(data?.error?.message || `Request failed (${res.status})`, res.status, data?.error?.code), { data });
  return data;
}

export const api = {
  library: () => request('GET', '/api/books'),
  health: () => request('GET', '/api/health'),
  book: (slug) => request('GET', `${paths.api(slug)}/book`),
  progress: (slug) => request('GET', `${paths.api(slug)}/progress`),
  topic: (id) => request('GET', `${paths.api()}/topic/${id}`),
  patchProgress: (id, patch, slug) => request('PATCH', `${paths.api(slug)}/progress/${id}`, patch),
  notes: (id) => request('GET', `${paths.api()}/notes/${id}`),
  saveNotes: (id, text, rev) => request('PUT', `${paths.api()}/notes/${id}`, { text, rev }),
  chats: (topicId) => request('GET', `${paths.api()}/chats/${topicId}`),
  searchChats: (q, topicId) => request('GET', `${paths.api()}/chats?${new URLSearchParams({ q, ...(topicId ? { topic: topicId } : {}) })}`),
  newThread: (topicId, body) => request('POST', `${paths.api()}/chats/${topicId}/threads`, body),
};

/** POST the current book's /chat and read the SSE response. Resolves when the stream ends. */
export async function streamChat(payload, { signal, onMeta, onDelta, onStatus, onError, onDone }) {
  let res;
  try {
    res = await fetch(`${paths.api()}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the local server. Is `npm start` still running?', 0, 'offline');
  }
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new ApiError(j?.error?.message || `Request failed (${res.status})`, res.status, j?.error?.code);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let ev = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      let j;
      try { j = JSON.parse(data); } catch { continue; }
      if (ev === 'meta') onMeta?.(j);
      else if (ev === 'delta') onDelta?.(j.t);
      else if (ev === 'status') onStatus?.(j);
      else if (ev === 'error') onError?.(j);
      else if (ev === 'done') onDone?.(j);
    }
  }
}
