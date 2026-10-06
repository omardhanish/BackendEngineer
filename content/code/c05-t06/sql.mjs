import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const books = pgTable('books', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  year: integer('year'),
});
const db = drizzle(process.env.DATABASE_URL);
const show = ({ sql, params }) => console.log(sql, params);

show(db.select().from(books).where(eq(books.id, 2)).toSQL());
show(db.update(books).set({ year: 1966 }).where(eq(books.id, 2)).toSQL());
show(db.update(books).set({ year: 1966 }).toSQL());
await db.$client.end();
