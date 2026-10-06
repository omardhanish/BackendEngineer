import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  integer, pgTable, serial, text, timestamp, varchar,
} from 'drizzle-orm/pg-core';

// src/db/schema.js (users is unchanged from lecture 6)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const urls = pgTable('urls', {
  id: serial('id').primaryKey(),
  shortCode: varchar('short_code', { length: 10 }).notNull().unique(),
  targetUrl: text('target_url').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Setup so this file runs alone: a migration would create these tables.
const db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`
  create table users (id serial primary key, email text not null unique,
    password_hash text not null, created_at timestamp not null default now());
  create table urls (id serial primary key,
    short_code varchar(10) not null unique, target_url text not null,
    user_id integer not null references users(id) on delete cascade,
    created_at timestamp not null default now())`);
await db.insert(users).values([
  { email: 'ada@example.com', passwordHash: 'x' },
  { email: 'grace@example.com', passwordHash: 'x' },
]);

const link = (shortCode, userId) => ({
  shortCode, targetUrl: 'https://example.com', userId,
});
await db.insert(urls).values([
  link('abc1234', 1), link('def5678', 1), link('ghi9012', 2),
]);
await db.insert(urls).values(link('abc1234', 2))
  .catch((err) => console.log('same code again:', err.cause.code));
await db.insert(urls).values(link('zzz9999', 9))
  .catch((err) => console.log('unknown owner:', err.cause.code));
await db.delete(users).where(eq(users.id, 1));
console.log('links left:', (await db.select().from(urls)).length);
await db.$client.end();
