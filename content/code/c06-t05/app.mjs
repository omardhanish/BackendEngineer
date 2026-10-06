import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { and, eq, gt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
});
const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
});
const db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`create table users (id serial primary key,
  email text not null unique, password_hash text not null,
  role text not null default 'user')`);
await db.execute(sql`create table sessions (id text primary key,
  user_id integer references users(id), expires_at timestamp not null)`);
await db.insert(users).values({ email: 'ada@example.com',
  passwordHash: await bcrypt.hash('demo-password', 4) });

async function createSession(userId) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return id;
}
async function getSessionUser(sid) {
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sid), gt(sessions.expiresAt, new Date())));
  return row ?? null;
}
const destroySession = (sid) => db.delete(sessions).where(eq(sessions.id, sid));

const authenticate = async (req, res, next) => {
  const sid = req.cookies.sid;
  const user = sid && (await getSessionUser(sid));
  if (!user) return res.status(401).json({ error: 'login required' });
  req.user = user;
  next();
};

const app = express();
app.use(express.json(), cookieParser());

app.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password required' });
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const sid = await createSession(user.id);
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
  res.json({ email: user.email });
});

app.use(authenticate); // every route below needs a login

app.get('/me', (req, res) => res.json(req.user));

app.post('/logout', async (req, res) => {
  await destroySession(req.cookies.sid);
  res.clearCookie('sid');
  res.status(204).end();
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, path, { cookie = '', body } = {}) => {
    const headers = { 'content-type': 'application/json', cookie };
    const res = await fetch(base + path, {
      method, headers, body: body && JSON.stringify(body) });
    console.log(method, path, res.status, await res.text());
    return res.headers.get('set-cookie');
  };
  const login = (password) => call('POST', '/login',
    { body: { email: 'ada@example.com', password } });
  await call('GET', '/me');
  await call('POST', '/login', { body: {} });
  await login('wrong-password');
  const cookie = (await login('demo-password')).split(';')[0];
  await call('GET', '/me', { cookie });
  await call('POST', '/logout', { cookie });
  await call('GET', '/me', { cookie });
  server.close();
  await db.$client.end();
});
