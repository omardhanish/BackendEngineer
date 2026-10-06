import express from 'express';
import jwt from 'jsonwebtoken';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

process.env.JWT_SECRET ??= 'demo-secret'; // demo value only
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
});
const db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`create table users (id serial primary key,
  email text not null unique, password_hash text not null,
  role text not null default 'user')`);
await db.insert(users).values([
  { email: 'ada@example.com', passwordHash: 'unused' },
  { email: 'grace@example.com', passwordHash: 'unused', role: 'admin' },
]);

const authenticate = (req, res, next) => {
  try {
    const token = req.get('authorization')?.replace('Bearer ', '');
    req.user = jwt.verify(token, process.env.JWT_SECRET,
      { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'login required' });
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
};

const app = express();
app.get('/books', authenticate, (req, res) => res.json(['Dune', 'Emma']));
app.get('/users', authenticate, requireRole('admin'), async (req, res) => {
  const rows = await db.select({ email: users.email }).from(users)
    .orderBy(users.id);
  res.json(rows);
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}`;
  const [ada, grace] = await db.select().from(users).orderBy(users.id);
  const sign = ({ id, role }) => jwt.sign({ sub: String(id), role },
    process.env.JWT_SECRET, { expiresIn: '15m' });
  const call = async (path, user) => {
    const headers = user ? { authorization: `Bearer ${sign(user)}` } : {};
    const res = await fetch(url + path, { headers });
    console.log(path, user?.email ?? 'nobody', res.status, await res.text());
  };
  await call('/users');
  await call('/users', ada);
  await call('/users', grace);
  await call('/books', ada);
  server.close();
  await db.$client.end();
});
