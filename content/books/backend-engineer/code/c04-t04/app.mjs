import express from 'express';

const books = new Map([[1, { id: 1, title: 'Dune' }]]);
let nextId = 2;
const app = express();
app.use(express.json());

app.get('/books', (req, res) => res.json([...books.values()]));
app.get('/books/:id', (req, res) => {
  const book = books.get(Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'not found' });
  res.json(book);
});
app.post('/books', (req, res) => {
  const book = { id: nextId++, title: req.body.title };
  books.set(book.id, book);
  res.status(201).location(`/books/${book.id}`).json(book);
});
app.delete('/books/:id', (req, res) => {
  const found = books.delete(Number(req.params.id));
  res.sendStatus(found ? 204 : 404);
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, path, body) => {
    const headers = { 'content-type': 'application/json' };
    const res = await fetch(base + path, {
      method, headers, body: body && JSON.stringify(body),
    });
    console.log(method, path, res.status);
  };
  await call('POST', '/books', { title: 'Emma' });
  await call('GET', '/books/2');
  await call('DELETE', '/books/2');
  await call('GET', '/books/2');
  server.close();
});
