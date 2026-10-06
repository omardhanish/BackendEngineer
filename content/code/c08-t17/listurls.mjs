import express from 'express';
import jwt from 'jsonwebtoken';
import { desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  integer, pgTable, serial, text, timestamp, varchar,
} from 'drizzle-orm/pg-core';

// src/services/url.service.js
export async function listUrls(userId) {
  return db
    .select({
      id: urls.id,
      shortCode: urls.shortCode,
      targetUrl: urls.targetUrl,
    })
    .from(urls)
    .where(eq(urls.userId, userId))
    .orderBy(desc(urls.id));
}

// src/controllers/urls.controller.js
export async function listMyUrls(req, res) {
  const rows = await listUrls(req.user.id);
  res.json({ urls: rows });
}

// src/routes/urls.routes.js (before the /:shortCode route)
const router = express.Router();
router.get('/codes', requireAuth, listMyUrls);

// Setup so this file runs alone: lecture 12's middleware, condensed.
const secret = 'demo-secret'; // a demo value; the project reads JWT_SECRET
function requireAuth(req, res, next) {
  const token = req.get('authorization')?.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { id: Number(payload.sub), email: payload.email };
  next();
}
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
const emails = ['ada', 'grace', 'alan'].map((n) => `${n}@example.com`);
await db.insert(users).values(emails.map((email) => (
  { email, passwordHash: 'x' }
)));
const link = (shortCode, userId) => (
  { shortCode, targetUrl: 'https://example.com', userId }
);
await db.insert(urls).values([
  link('abc1234', 1), link('def5678', 1), link('ghi9012', 2),
]);
const app = express();
app.use(router);

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const sign = (id) => jwt.sign(
    { sub: String(id), email: emails[id - 1] },
    secret,
  );
  const call = async (name, token) => {
    const res = await fetch(`${base}/codes`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    const body = await res.json();
    const shown = body.urls?.map((u) => u.shortCode) ?? body;
    console.log(`${name}: ${res.status} ${JSON.stringify(shown)}`);
  };
  await call('nobody');
  await call('ada', sign(1));
  await call('grace', sign(2));
  await call('alan', sign(3));
  server.close();
  await db.$client.end();
});
