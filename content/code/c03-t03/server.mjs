import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log('request:', req.method, req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('hello');
});

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  for (const path of ['/hi', '/again']) {
    const res = await fetch(base + path);
    console.log(res.status, await res.text());
  }
  server.close();
});
