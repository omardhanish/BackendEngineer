import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// src/db/schema.js
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Setup so this file runs alone: `drizzle-kit push` would create the table.
const db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`create table users (
  id serial primary key, email text not null unique,
  password_hash text not null, created_at timestamp not null default now())`);

const ada = { email: 'ada@example.com', passwordHash: 'demo-hash' };
await db.insert(users).values(ada);
const [row] = await db.select().from(users);
console.log(Object.keys(row));
console.log(row.id, row.createdAt instanceof Date);

const refused = (label) => (err) => console.log(label, err.cause.code);
await db.insert(users).values(ada).catch(refused('same email:'));
await db.insert(users).values({ email: 'grace@example.com' })
  .catch(refused('no hash:'));
await db.$client.end();
