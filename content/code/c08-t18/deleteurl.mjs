import express from 'express';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  integer, pgTable, serial, text, timestamp, varchar,
} from 'drizzle-orm/pg-core';

// src/services/url.service.js
export async function deleteUrl({ id, userId }) {
  const [row] = await db
    .select({ userId: urls.userId })
    .from(urls)
    .where(eq(urls.id, id));
  if (!row) return 'not_found';
  if (row.userId !== userId) return 'forbidden';
  await db.delete(urls).where(eq(urls.id, id));
  return 'deleted';
}

// src/controllers/urls.controller.js
const MAX_ID = 2 ** 31 - 1; // serial ids are 32-bit integers
const notFound = (res) =>
  res.status(404).json({ error: 'Short URL not found' });

export async function removeUrl(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id > MAX_ID) return notFound(res);
  const result = await deleteUrl({ id, userId: req.user.id });
  if (result === 'not_found') return notFound(res);
  if (result === 'forbidden') {
    return res.status(403).json({ error: 'You do not own this URL' });
  }
  res.status(204).end();
}

// src/routes/urls.routes.js
const router = express.Router();
router.delete('/codes/:id', requireAuth, removeUrl);

// Setup so this file runs alone: lectures 11 and 12, condensed.
process.env.JWT_SECRET = 'demo-secret'; // a demo value, never a real secret
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],
});
function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  let claims;
  try {
    if (scheme !== 'Bearer') throw new Error('not a bearer token');
    claims = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { id: Number(claims.sub), email: claims.email };
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
const emails = ['ada@example.com', 'grace@example.com'];
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
    process.env.JWT_SECRET,
  );
  const tokens = { ada: sign(1), grace: sign(2) };
  const del = async (who, id) => {
    const res = await fetch(`${base}/codes/${id}`, {
      method: 'DELETE',
      headers: who ? { authorization: `Bearer ${tokens[who]}` } : {},
    });
    const body = await res.text();
    console.log(`${who ?? 'nobody'} deletes ${id}:`, res.status, body);
  };
  await del(undefined, 1);
  await del('grace', 1);
  await del('ada', 1);
  await del('ada', 1);
  await del('ada', 'abc');
  await del('ada', 99999999999);
  console.log('rows left:', (await db.select().from(urls)).length);
  server.close();
  await db.$client.end();
});
