import express from 'express';
import mongoose from 'mongoose';

const Book = mongoose.model('Book', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
}));
const show = (b) =>
  ({ id: b.id, title: b.title, author: b.author, year: b.year });
const pick = ({ title, author, year } = {}) => ({ title, author, year });

const loadBook = async (req, res, next) => {
  const { id } = req.params;
  const book = mongoose.isValidObjectId(id) ? await Book.findById(id) : null;
  if (!book) return res.status(404).json({ error: 'Book not found' });
  req.book = book;
  next();
};

const app = express();
app.use(express.json());
app.get('/books', async (req, res) => {
  res.json((await Book.find().sort('year')).map(show));
});
app.post('/books', async (req, res) => {
  res.status(201).json(show(await Book.create(pick(req.body))));
});
app.get('/books/:id', loadBook, (req, res) => res.json(show(req.book)));
app.put('/books/:id', loadBook, async (req, res) => {
  req.book.set(pick(req.body));
  res.json(show(await req.book.save()));
});
app.delete('/books/:id', loadBook, async (req, res) => {
  await req.book.deleteOne();
  res.status(204).end();
});
app.use((err, req, res, next) => {
  if (err.name !== 'ValidationError') {
    return res.status(500).json({ error: 'Server error' });
  }
  const fields = Object.keys(err.errors);
  res.status(400).json({ error: 'Invalid book', fields });
});

await mongoose.connect(process.env.MONGO_URI);
const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (label, method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = res.status === 204 ? null : await res.json();
    // The replacer array leaves out `id`, which changes on every run.
    const keys = ['title', 'author', 'year', 'error', 'fields'];
    console.log(label, res.status, data ? JSON.stringify(data, keys) : '');
    return data;
  };
  const dune = { title: 'Dune', author: 'Frank Herbert', year: 1965 };
  const gibson = { title: 'Neuromancer', author: 'William Gibson', year: 1984 };
  await call('create', 'POST', '/books', gibson);
  const { id } = await call('create', 'POST', '/books', dune);
  await call('invalid', 'POST', '/books', { title: 'Untitled', year: 'soon' });
  await call('list', 'GET', '/books');
  await call('replace', 'PUT', `/books/${id}`, { ...dune, year: 1966 });
  await call('partial', 'PUT', `/books/${id}`, { title: 'Dune' });
  await call('bad id', 'GET', '/books/abc');
  await call('delete', 'DELETE', `/books/${id}`);
  await call('again', 'DELETE', `/books/${id}`);
  server.close();
  await mongoose.disconnect();
});
