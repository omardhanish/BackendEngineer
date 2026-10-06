import http from 'node:http';

const server = http.createServer((req, res) => {
  const isCreate = req.method === 'POST' && req.url === '/notes';
  res.writeHead(isCreate ? 201 : 404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(isCreate ? { id: 1 } : { error: 'not found' }));
});

server.listen(0, async () => {
  const url = `http://localhost:${server.address().port}`;
  const post = await fetch(`${url}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'buy tea' }),
  });
  console.log(post.status, post.ok, await post.json());
  const missing = await fetch(`${url}/nope`);
  console.log(missing.status, missing.ok, await missing.json());
  server.close();
});
