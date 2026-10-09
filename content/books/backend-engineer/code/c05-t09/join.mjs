import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { eq, sql } from 'drizzle-orm';

export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});
export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => authors.id),
  year: integer('year'),
});

const db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`
  create table authors (id serial primary key, name text not null unique);
  create table books (id serial primary key, title text not null,
    author_id integer references authors(id), year integer);
  insert into authors (name) values
    ('Frank Herbert'), ('Ursula K. Le Guin'), ('William Gibson');
  insert into books (title, author_id, year) values
    ('Dune', 1, 1965), ('Neuromancer', 3, 1984),
    ('The Dispossessed', 2, 1974)`);

console.log(await db.select({ title: books.title, author: authors.name })
  .from(books).innerJoin(authors, eq(books.authorId, authors.id))
  .orderBy(books.id));

const attempt = async (label, query) => {
  try {
    await query;
    console.log(label, 'ok');
  } catch (err) {
    console.log(label, 'failed with', err.cause.code);
  }
};
await attempt('unknown author:', db.insert(books)
  .values({ title: 'Hyperion', authorId: 99, year: 1989 }));
await attempt('delete author 1:', db.delete(authors).where(eq(authors.id, 1)));
await db.$client.end();
