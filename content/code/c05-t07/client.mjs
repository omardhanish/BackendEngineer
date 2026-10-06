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

const app = express();
app.use(express.json());
app.post('/books', async (req, res) => {
  const { title, author, year } = req.body;
  const [book] = await db.insert(books)
    .values({ title, author, year }).returning();
  res.status(201).json(book);
});
app.get('/books/:id', async (req, res) => {
  const [book] = await db.select().from(books)
    .where(eq(books.id, Number(req.params.id)));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});
app.delete('/books/:id', async (req, res) => {
  const gone = await db.delete(books)
    .where(eq(books.id, Number(req.params.id))).returning();
  if (gone.length === 0) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.status(204).end();
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  let failed = 0;
  const check = (name, ok) => {
    console.log(ok ? 'PASS' : 'FAIL', name);
    if (!ok) failed++;
  };
  const send = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };

  const hyperion = { title: 'Hyperion', author: 'Dan Simmons', year: 1989 };
  const created = await send('POST', '/books', hyperion);
  check('POST /books gives 201', created.status === 201);
  const id = created.json.id;
  const found = await send('GET', `/books/${id}`);
  check('GET returns the new title', found.json.title === 'Hyperion');
  const removed = await send('DELETE', `/books/${id}`);
  check('DELETE gives 204', removed.status === 204);
  const again = await send('GET', `/books/${id}`);
  check('GET after DELETE gives 404', again.status === 404);
  console.log(failed === 0 ? 'all passed' : `${failed} failed`);

  server.close();
  await db.$client.end();
});
