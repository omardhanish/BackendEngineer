import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { gt } from 'drizzle-orm';

const books = pgTable('books', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  year: integer('year'),
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`create table books (id serial primary key,
  title text not null, author text not null, year integer);
  insert into books (title, author, year) values
  ('Dune', 'Frank Herbert', 1965), ('Neuromancer', 'William Gibson', 1984),
  ('The Dispossessed', 'Ursula K. Le Guin', 1974)`);

const raw = await pool.query(
  'select title from books where year > $1 order by title', [1970]);
console.log(raw.rows);

const db = drizzle({ client: pool });
const query = db.select({ title: books.title }).from(books)
  .where(gt(books.year, 1970)).orderBy(books.title);
console.log(query.toSQL().sql);
console.log(await query);
await pool.end();
