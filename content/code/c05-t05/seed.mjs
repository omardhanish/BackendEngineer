import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { books } from './schema.js';

const db = drizzle(process.env.DATABASE_URL);
// Normally `npx drizzle-kit push` creates this table from schema.js.
await db.execute(sql`create table books (id serial primary key,
  title text not null, author text not null, year integer)`);
await db.insert(books).values([
  { title: 'Dune', author: 'Frank Herbert', year: 1965 },
  { title: 'Neuromancer', author: 'William Gibson', year: 1984 },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', year: 1974 },
]);
console.log(await db.select().from(books).orderBy(books.id));
await db.$client.end();
