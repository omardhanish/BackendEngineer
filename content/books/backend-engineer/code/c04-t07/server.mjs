import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const JWT_SECRET = 'supersecret123';
const books = [];

app.get('/books', (req, res) => {
  res.json(books);
});

app.post('/books', (req, res) => {
  const book = { id: books.length + 1, ...req.body };
  books.push(book);
  res.status(200).json(book);
});

app.get('/books/:id', (req, res) => {
  const book = books.find((b) => b.id == req.params.id);
  if (!book) return res.status(200).json({ error: 'not found' });
  res.json(book);
});

app.delete('/books/:id', (req, res) => {
  const i = books.findIndex((b) => b.id == req.params.id);
  books.splice(i, 1);
  res.json({ ok: true });
});

app.post('/login', (req, res) => {
  console.log('login attempt', req.body);
  if (req.body.password === 'admin') return res.json({ token: JWT_SECRET });
  res.status(401).send('nope');
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message, stack: err.stack });
});

app.listen(3000);
