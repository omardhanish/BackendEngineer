import http from 'node:http';
const tasks = new Map();
let nextId = 1;
const send = (res, status, data) =>
  res.writeHead(status, { 'Content-Type': 'application/json' })
    .end(data && JSON.stringify(data));
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };
export const server = http.createServer(async (req, res) => {
  const { pathname: path } = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && path === '/tasks')
    return send(res, 200, [...tasks.values()]);
  if (req.method === 'POST' && path === '/tasks') {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const title = parse(Buffer.concat(chunks).toString())?.title;
    if (typeof title !== 'string' || !title)
      return send(res, 400, { error: 'title is required' });
    tasks.set(nextId, { id: nextId, title, done: false });
    return send(res, 201, tasks.get(nextId++));
  }
  const id = path.match(/^\/tasks\/(\d+)$/)?.[1];
  if (req.method === 'DELETE' && id && tasks.delete(Number(id)))
    return send(res, 204); // otherwise fall through to the 404
  send(res, 404, { error: 'not found' });
});
