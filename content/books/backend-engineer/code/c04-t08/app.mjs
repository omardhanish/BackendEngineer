import express from 'express';

const app = express();
app.use((req, res, next) => {
  console.log('logger:', req.method, req.url);
  next();
});
app.use((req, res, next) => {
  if (req.get('authorization')) return next();
  res.status(401).send('no token');
});
app.get('/books', (req, res) => res.json(['Dune', 'Emma']));

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/books`;
  console.log((await fetch(url)).status);
  console.log((await fetch(url, { headers: { authorization: 'x' } })).status);
  server.close();
});
