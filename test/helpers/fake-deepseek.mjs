// A tiny stand-in for the DeepSeek API. Behaviour is chosen by a [[marker]] in the last user message,
// so tests can simulate every failure mode without touching the real service or key.
import http from 'node:http';

const chunk = (delta, extra = {}) => `data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: null }], ...extra })}\n\n`;
const final = `data: ${JSON.stringify({ id: 'x', choices: [{ index: 0, delta: { content: '' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } })}\n\n`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startFakeDeepSeek() {
  const requests = [];
  const events = [];
  let flaky = 0;

  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/models') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ data: [{ id: 'deepseek-flash' }, { id: 'deepseek-v4-pro' }] }));
    }
    if (req.method !== 'POST' || req.url !== '/chat/completions') { res.statusCode = 404; return res.end(); }
    let raw = '';
    for await (const c of req) raw += c;
    const body = JSON.parse(raw);
    requests.push({ headers: req.headers, body });
    const last = body.messages.at(-1).content;
    const mark = /\[\[([a-z0-9-]+)\]\]/.exec(last)?.[1];
    res.on('close', () => { if (!res.writableEnded) events.push('upstream-closed'); }); // (req 'close' fires when the body is read, not on disconnect)

    if (mark === 'echo-key') {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ error: { message: `bad header ${req.headers.authorization}` } }));
    }
    if (mark === '401' || mark === '402' || mark === '500' || mark === '400') {
      res.statusCode = Number(mark);
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ error: { message: `fake ${mark}` } }));
    }
    if (mark === '429-then-ok' && flaky++ === 0) {
      res.statusCode = 429;
      res.setHeader('retry-after', '0');
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ error: { message: 'slow down' } }));
    }
    if (mark === 'hang') return; // never answers; the client must abort

    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    res.write(': keep-alive\n\n');
    res.write(chunk({ role: 'assistant', content: '' }));
    if (mark === 'drop') {
      res.write(chunk({ content: 'partial ' }));
      await sleep(30);
      return res.destroy();
    }
    if (mark === 'split') {
      const bytes = Buffer.from(chunk({ content: 'héllo 🙂 done' }));
      const cut = bytes.indexOf(Buffer.from('🙂')) + 2; // inside the 4-byte emoji
      res.write(bytes.subarray(0, cut));
      await sleep(40);
      res.write(bytes.subarray(cut));
    } else {
      for (const t of ['Hello ', 'world', '!']) { res.write(chunk({ content: t })); await sleep(5); }
    }
    res.write(final);
    res.write('data: [DONE]\n\n');
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    requests,
    events,
    reset() { requests.length = 0; events.length = 0; flaky = 0; },
    close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }),
  };
}
