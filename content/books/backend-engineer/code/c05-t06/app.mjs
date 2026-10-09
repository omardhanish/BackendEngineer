import express from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { eq, sql } from 'drizzle-orm';

const books = pgTable('books', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  year: integer('year'),
});
const db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`create table books (id serial primary key,
  title text not null, author text not null, year integer)`);
await db.insert(books).values([
  { title: 'Dune', author: 'Frank Herbert', year: 1965 },
  { title: 'Neuromancer', author: 'William Gibson', year: 1984 },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', year: 1974 },
]);

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isValid = (b) =>
  isText(b?.title) && isText(b?.author) && Number.isInteger(b?.year);
const fail = (res, code, error) => res.status(code).json({ error });
const idOf = (req) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 && id < 2 ** 31 ? id : 0;
};

const listBooks = async (req, res) =>
  res.json(await db.select().from(books).orderBy(books.id));

const getBook = async (req, res) => {
  const [book] = await db.select().from(books).where(eq(books.id, idOf(req)));
  if (!book) return fail(res, 404, 'Book not found');
  res.json(book);
};

const createBook = async (req, res) => {
  if (!isValid(req.body)) return fail(res, 400, 'Send title, author and year');
  const { title, author, year } = req.body;
  const [book] = await db.insert(books)
    .values({ title, author, year }).returning();
  res.status(201).location(`/books/${book.id}`).json(book);
};

const updateBook = async (req, res) => {
  if (!isValid(req.body)) return fail(res, 400, 'Send title, author and year');
  const { title, author, year } = req.body;
  const [book] = await db.update(books).set({ title, author, year })
    .where(eq(books.id, idOf(req))).returning();
  if (!book) return fail(res, 404, 'Book not found');
  res.json(book);
};

const deleteBook = async (req, res) => {
  const gone = await db.delete(books)
    .where(eq(books.id, idOf(req))).returning();
  if (gone.length === 0) return fail(res, 404, 'Book not found');
  res.status(204).end();
};

const app = express();
app.use(express.json());
app.get('/books', listBooks);
app.get('/books/:id', getBook);
app.post('/books', createBook);
app.put('/books/:id', updateBook);
app.delete('/books/:id', deleteBook);

const server = app.listen(0, async () => {
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
  await call('GET', '/books/2');
  await call('GET', '/books/abc');
  await call('POST', '/books', { ...hyperion, year: 1898 });
  await call('PUT', '/books/4', { ...hyperion, id: 99 });
  await call('PUT', '/books/4', { title: 'Hyperion' });
  await call('PUT', '/books/9', hyperion);
  await call('DELETE', '/books/4');
  await call('DELETE', '/books/4');
  const list = await (await fetch(`${base}/books`)).json();
  console.log('ids left:', list.map((b) => b.id).join(' '));
  server.close();
  await db.$client.end();
});
