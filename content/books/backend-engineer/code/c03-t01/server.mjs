import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify([{ id: 1, title: 'Dune' }]));
});

server.listen(0, () => {
  http.get({ port: server.address().port, path: '/books' }, (res) => {
    console.log(res.statusCode, res.headers['content-type']);
    res.resume().on('end', () => server.close());
  });
});
