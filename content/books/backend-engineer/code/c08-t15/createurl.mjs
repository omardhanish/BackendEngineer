import express from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  integer, pgTable, serial, text, timestamp, varchar,
} from 'drizzle-orm/pg-core';

// src/services/url.service.js
export async function createUrl(
  { userId, targetUrl },
  makeCode = () => nanoid(7),
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db
      .insert(urls)
      .values({ shortCode: makeCode(), targetUrl, userId })
      .onConflictDoNothing()
      .returning({ shortCode: urls.shortCode });
    if (row) return row.shortCode;
  }
  throw new Error('Could not generate a unique short code');
}

// src/controllers/urls.controller.js
export async function shorten(req, res) {
  const parsed = shortenSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const shortCode = await createUrl({
    userId: req.user.id,
    targetUrl: parsed.data.url,
  });
  res.status(201).json({ shortCode });
}

// Setup so this file runs alone: schema, tables, one user, an app.
const shortenSchema = z.object({ url: z.url({ protocol: /^https?$/ }) });
const badRequest = (res, { issues }) => res.status(400).json({
  error: 'Validation failed',
  issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});
const requireAuth = (req, res, next) => {
  req.user = { id: 1, email: 'ada@example.com' }; // lecture 12 sets this
  next();
};
const db = drizzle(process.env.DATABASE_URL);
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
const urls = pgTable('urls', {
  id: serial('id').primaryKey(),
  shortCode: varchar('short_code', { length: 10 }).notNull().unique(),
  targetUrl: text('target_url').notNull(),
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
await db.execute(sql`
  create table users (id serial primary key, email text not null unique,
    password_hash text not null, created_at timestamp not null default now());
  create table urls (id serial primary key,
    short_code varchar(10) not null unique, target_url text not null,
    user_id integer not null references users(id) on delete cascade,
    created_at timestamp not null default now())`);
await db.insert(users).values({ email: 'ada@example.com', passwordHash: 'x' });
const app = express();
app.use(express.json());
app.post('/shorten', requireAuth, shorten);

const server = app.listen(0, async () => {
  const res = await fetch(`http://localhost:${server.address().port}/shorten`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/docs' }),
  });
  const { shortCode } = await res.json();
  console.log(res.status, shortCode.length);
  const [row] = await db.select().from(urls);
  console.log('saved:', row.shortCode === shortCode, row.targetUrl);

  const input = { userId: 1, targetUrl: 'https://example.com/b' };
  const codes = [shortCode, 'fresh01'];
  const next = () => codes.shift();
  console.log('after a collision:', await createUrl(input, next));
  await createUrl(input, () => shortCode).catch((e) => console.log(e.message));
  server.close();
  await db.$client.end();
});
