import http from 'node:http';

const server = http.createServer();
server.on('request', (req, res) => {
  console.log('event: request', req.method, req.url);
  res.end('hello');
});
server.on('close', () => console.log('event: close'));
server.on('listening', async () => {
  console.log('event: listening');
  await (await fetch(`http://localhost:${server.address().port}/hi`)).text();
  server.close();
});
server.listen(0);
