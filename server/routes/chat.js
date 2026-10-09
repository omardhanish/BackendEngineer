// POST /api/chat — streams a tutor answer over SSE and persists both sides of the exchange.
//
// Concurrency discipline (found by the security review): the slot in `controllers`, the per-thread lock in
// `streaming` and the "client went away" listener are all taken before the first `await`, so simultaneous
// requests cannot all slip past the caps and a closed tab always cancels the upstream call.
import { ID_RE, THREAD_RE, MSG_ID_RE, str, scrub } from '../lib/security.js';
import { openSse, sendEvent } from '../lib/sse.js';
import { Chats } from '../lib/chats.js';
import { buildMessages } from '../lib/prompt.js';
import { ClientGone } from '../lib/deepseek.js';

const MODES = new Set(['ask', 'roleplay', 'debrief']);
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const today = () => new Date().toISOString().slice(0, 10);

const cleanLive = (l) => {
  if (!l || typeof l !== 'object') return null;
  return {
    frame: Number.isInteger(l.frame) ? l.frame : null,
    frameLabel: str(l.frameLabel, 40),
    step: Number.isInteger(l.step) ? l.step : null,
    code: str(l.code, 2000),
    error: str(l.error, 500),
    challenge: str(l.challenge, 40),
    revealed: str(l.revealed, 120),
  };
};

export function chatRoutes(router, ctx) {
  const { config, deepseek, store, limiter, log, streaming, controllers } = ctx;

  const addUsage = (tokens) => store.update('usage.json', (u) => {
    const d = today();
    if (u.day !== d) { u.day = d; u.tokens = 0; }
    u.tokens += tokens;
  }, { day: '', tokens: 0 }).catch((e) => log.error(`usage: ${e.message}`));

  router.post('/chat', async (req, res) => {
    // ---- 1. synchronous validation (no awaits yet)
    const { content, chats, meta } = req.bk; // this book's pages and this book's saved chats
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const topicId = typeof b.topicId === 'string' ? b.topicId : '';
    const message = str(b.message, config.limits.messageChars + 1).trim();
    const clientMsgId = typeof b.clientMsgId === 'string' ? b.clientMsgId : '';
    const threadId = typeof b.threadId === 'string' ? b.threadId : undefined;
    const quote = str(b.quote, 1200).trim() || undefined;
    let mode = MODES.has(b.mode) ? b.mode : 'ask';

    if (!ID_RE.test(topicId) || !content.has(topicId)) return fail(res, 404, 'unknown_topic', 'Unknown page.');
    if (!MSG_ID_RE.test(clientMsgId)) return fail(res, 400, 'bad_client_id', 'Missing clientMsgId.');
    if (threadId && !THREAD_RE.test(threadId)) return fail(res, 400, 'bad_thread', 'Bad thread id.');
    if (!message && mode !== 'debrief') return fail(res, 400, 'empty', 'Write a message first.');
    if (message.length > config.limits.messageChars) return fail(res, 413, 'too_long', `Keep messages under ${config.limits.messageChars} characters.`);
    if (!config.deepseek.key) return fail(res, 503, 'no_key', 'No DeepSeek API key is configured. Add DEEPSEEK_API_KEY to .env and restart the server.');
    if (ctx.shuttingDown) return fail(res, 503, 'shutting_down', 'The server is shutting down.');
    if (!limiter.take()) return fail(res, 429, 'slow_down', 'Too many questions in a minute. Take a breath and try again.');
    if (controllers.size >= config.limits.concurrentStreams) return fail(res, 429, 'busy', 'Too many answers are being written at once.');

    // ---- 2. reserve the slot and watch for the client leaving, before the first await
    const ac = new AbortController();
    controllers.add(ac);
    res.on('close', () => { if (!res.writableFinished) ac.abort(new ClientGone()); });
    let lockedThread = null;

    try {
      const used = await store.read('usage.json', { day: '', tokens: 0 });
      if (used.day === today() && used.tokens >= config.limits.dailyTokens) return fail(res, 429, 'daily_cap', 'Daily token cap reached (set DAILY_TOKEN_CAP in .env to change it).');

      const topic = await content.topicPrivate(topicId);
      const key = topic.roleplay;
      if (topic.kind !== 'roleplay' || !key) mode = 'ask';
      const kind = mode === 'ask' ? 'ask' : 'roleplay';
      const model = config.deepseek.model;

      const thread = await chats.ensureThread(topicId, { threadId, kind, opening: key?.opening, model, fresh: !!b.fresh });
      // check-and-set with nothing awaited in between: one answer at a time per thread
      if (streaming.has(thread.id)) return fail(res, 409, 'busy_thread', 'This chat is still answering. Wait for it to finish or press Stop.');
      streaming.add(thread.id);
      lockedThread = thread.id;

      const added = await chats.addUser(topicId, thread.id, { clientMsgId, content: message || '(debrief requested)', quote });
      if (ac.signal.aborted) return undefined; // the tab closed while we were saving: nothing to answer, nothing to pay for

      openSse(res);
      await answer({ topic, key, mode, thread, added, model });
    } finally {
      controllers.delete(ac);
      if (lockedThread) streaming.delete(lockedThread);
    }

    // ---- 3. stream the answer, save it, report usage
    async function answer({ topic, key, mode: m, thread, added, model }) {
      let assistant = null;
      try {
        await sendEvent(res, 'meta', { threadId: thread.id, userMessageId: added.userMessage.id, model });

        if (added.duplicate && added.existingAnswer && ['complete', 'length'].includes(added.existingAnswer.status)) {
          // A retry of a request we already answered: replay instead of paying for it twice.
          // (Failed, stopped or interrupted answers fall through and are regenerated.)
          const a = added.existingAnswer;
          if (a.content) await sendEvent(res, 'delta', { t: a.content });
          await sendEvent(res, 'done', { status: a.status, usage: a.usage ?? null, messageId: a.id, replay: true });
          return void res.end();
        }

        const doc = await chats.get(topicId);
        const fresh = doc.threads.find((t) => t.id === thread.id);
        const history = Chats.contextOf(fresh, { exceptId: added.userMessage.id });
        assistant = await chats.startAssistant(topicId, thread.id, { model });

        let acc = '';
        let status = ac.signal.aborted ? 'stopped' : 'complete';
        let usage = null;
        let errInfo = null;
        let promptChars = 0;
        try {
          if (!ac.signal.aborted) {
            const { messages, temperature, maxTokens } = buildMessages({ topic, mode: m, history, userText: message, quote, live: cleanLive(b.live), limits: config.limits, key, book: meta });
            promptChars = messages.reduce((n, x) => n + x.content.length, 0);
            for await (const ev of deepseek.stream({ messages, temperature, maxTokens, signal: ac.signal, onStatus: (s) => sendEvent(res, 'status', s) })) {
              if (ev.type === 'delta') {
                acc += ev.text;
                await sendEvent(res, 'delta', { t: ev.text });
              } else if (ev.type === 'done') {
                usage = ev.usage;
                if (ev.finish_reason === 'length') status = 'length';
              }
            }
          }
        } catch (err) {
          if (err instanceof ClientGone) status = 'stopped';
          else if (ctx.shuttingDown) status = 'interrupted';
          else {
            status = acc ? 'interrupted' : 'error';
            // upstream text can echo request details; never forward or store it unscrubbed
            errInfo = { code: err.code || 'upstream', message: scrub(err.message || 'Something went wrong while answering.', [config.deepseek.key]) };
            log.warn(`chat ${topicId}: ${err.code || err.name}`);
          }
        } finally {
          await chats.finishAssistant(topicId, thread.id, assistant.id, { content: acc, status, usage, error: errInfo?.message });
          // exact usage when the final chunk arrived; otherwise an estimate (~3 chars per token) so stopped or
          // interrupted streams still count toward the daily cap. Requests the API rejected outright count nothing.
          const counted = acc.length > 0 || status === 'stopped' || status === 'interrupted';
          const tokens = usage?.total_tokens ?? (counted && promptChars ? Math.ceil((promptChars + acc.length) / 3) : 0);
          if (tokens) await addUsage(tokens);
        }
        if (errInfo) await sendEvent(res, 'error', errInfo);
        await sendEvent(res, 'done', { status, usage, messageId: assistant.id });
        res.end();
      } catch (err) {
        log.error(`chat ${topicId}: ${err.message}`);
        if (!res.writableEnded) {
          await sendEvent(res, 'error', { code: 'server', message: 'The server hit a problem while saving this chat.' });
          res.end();
        }
      }
    }
  });
}
