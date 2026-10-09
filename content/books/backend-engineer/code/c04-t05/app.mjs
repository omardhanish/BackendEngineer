import express from 'express';

const books = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965 },
  { id: 2, title: 'Neuromancer', author: 'William Gibson', year: 1984 },
  { id: 3, title: 'The Dispossessed', author: 'Ursula K. Le Guin', year: 1974 },
];
let nextId = 4;
const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isValid = (b) =>
  isText(b?.title) && isText(b?.author) && Number.isInteger(b?.year);
const bookIndex = (req) =>
  books.findIndex((b) => b.id === Number(req.params.id));
const fail = (res, code, error) => res.status(code).json({ error });

const app = express();
app.use(express.json());

app.get('/books', (req, res) => res.json(books));

app.get('/books/:id', (req, res) => {
  const i = bookIndex(req);
  if (i < 0) return fail(res, 404, 'Book not found');
  res.json(books[i]);
});

app.post('/books', (req, res) => {
  if (!isValid(req.body)) return fail(res, 400, 'Send title, author and year');
  const { title, author, year } = req.body;
  const book = { id: nextId++, title, author, year };
  books.push(book);
  res.status(201).location(`/books/${book.id}`).json(book);
});

const server = app.listen(0, async (err) => {
  if (err) throw err;
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log(method, path, res.status, await res.text());
  };
  const hyperion = { title: 'Hyperion', author: 'Dan Simmons', year: 1989 };
  await call('GET', '/books/1');
  await call('GET', '/books/9');
  await call('POST', '/books', hyperion);
  await call('POST', '/books', { title: 'Untitled' });
  await call('GET', '/books/4');
  server.close();
});
