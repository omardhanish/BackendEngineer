import http from 'node:http';

const notes = new Map([['1', 'milk'], ['2', 'eggs'], ['3', 'tea']]);
const send = (res, status, data, headers) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url, 'http://localhost');
  const [, resource, id, extra] = pathname.split('/');

  if (resource !== 'notes' || extra !== undefined) {
    return send(res, 404, { error: 'no such route' });
  }
  if (req.method !== 'GET') {
    return send(res, 405, { error: 'use GET' }, { Allow: 'GET' });
  }
  if (id === undefined) {
    const limit = Number(searchParams.get('limit') ?? notes.size);
    return send(res, 200, [...notes.values()].slice(0, limit));
  }
  if (!notes.has(id)) return send(res, 404, { error: 'no such note' });
  send(res, 200, notes.get(id));
});

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const tries = [
    ['GET', '/notes'], ['GET', '/notes?limit=1'], ['GET', '/notes/2'],
    ['POST', '/notes'], ['GET', '/nope'],
  ];
  for (const [method, path] of tries) {
    const res = await fetch(base + path, { method });
    console.log(method, path, res.status, await res.text());
  }
  server.close();
});
