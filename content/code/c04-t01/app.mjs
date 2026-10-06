import express from 'express';

const app = express();
app.use((req, res, next) => {
  console.log('request:', req.method, req.url);
  next();
});
app.get('/hello/:name', (req, res) => res.json({ hello: req.params.name }));

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  for (const path of ['/hello/Ana', '/nope']) {
    console.log(path, (await fetch(base + path)).status);
  }
  server.close();
});
