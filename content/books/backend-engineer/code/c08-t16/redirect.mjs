import express from 'express';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  integer, pgTable, serial, text, timestamp, varchar,
} from 'drizzle-orm/pg-core';

// src/services/url.service.js
export async function findTarget(shortCode) {
  const [row] = await db
    .select({ targetUrl: urls.targetUrl })
    .from(urls)
    .where(eq(urls.shortCode, shortCode));
  return row?.targetUrl ?? null;
}

// src/controllers/urls.controller.js
export async function redirect(req, res) {
  const target = await findTarget(req.params.shortCode);
  if (!target) return res.status(404).json({ error: 'Short URL not found' });
  res.redirect(target);
}

// src/routes/urls.routes.js (this route goes last in the file)
const router = express.Router();
router.get('/:shortCode', redirect);

// Setup so this file runs alone: schema, tables, one URL, an app.
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
await db.insert(urls).values({
  shortCode: 'abc1234', targetUrl: 'https://example.com/docs', userId: 1,
});

// src/app.js: /health is registered before the router
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use(router);

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const hit = async (path) => {
    const res = await fetch(base + path, { redirect: 'manual' });
    return [res.status, res.headers.get('location'), await res.text()];
  };
  const [status, location] = await hit('/abc1234');
  console.log(status, location);
  const [missing, , body] = await hit('/zzz9999');
  console.log(missing, body);
  console.log('/health', (await hit('/health'))[0]);
  server.close();
  await db.$client.end();
});
