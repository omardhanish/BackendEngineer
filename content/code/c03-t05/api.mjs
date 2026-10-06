import http from 'node:http';

const notes = [];
const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};
const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
};

const notFound = () => [404, { error: 'no such route' }];
const routes = {
  'GET /notes': () => [200, notes],
  'POST /notes': async (req) => {
    const { text } = (await readJson(req)) ?? {};
    if (typeof text !== 'string') return [400, { error: 'text is required' }];
    const note = { id: notes.length + 1, text };
    notes.push(note);
    return [201, note];
  },
};

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    const handler = routes[`${req.method} ${pathname}`] ?? notFound;
    const [status, data] = await handler(req);
    send(res, status, data);
  } catch (err) {
    const bad = err instanceof SyntaxError;
    if (!bad) console.error(err);
    send(res, bad ? 400 : 500, { error: bad ? 'bad JSON' : 'server error' });
  }
});

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json' };
  const calls = [
    ['POST', '/notes', '{"text":"buy tea"}'], ['POST', '/notes', '{"text":'],
    ['POST', '/notes', '{}'], ['GET', '/notes'], ['GET', '/nope'],
  ];
  for (const [method, path, body] of calls) {
    const res = await fetch(base + path, { method, headers, body });
    console.log(method, path, res.status, await res.text());
  }
  server.close();
});
