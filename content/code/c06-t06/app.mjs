import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { eq, sql } from 'drizzle-orm';

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
await db.insert(users).values({ email: 'ada@example.com',
  passwordHash: await bcrypt.hash('ada-pw', 4) });

const app = express();
app.use(express.json());

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const claims = { sub: String(user.id), role: user.role };
  const token = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: '15m' });
  res.json({ token });
});

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

app.get('/me', authenticate, (req, res) => {
  res.json({ id: req.user.sub, role: req.user.role }); // no query here
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}`;
  const login = await fetch(`${url}/login`, { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', password: 'ada-pw' }) });
  const { token } = await login.json();

  await db.$client.end(); // the database is gone; the token still works
  const headers = { authorization: `Bearer ${token}` };
  const me = await fetch(`${url}/me`, { headers });
  console.log(me.status, await me.json());
  const anon = await fetch(`${url}/me`);
  console.log(anon.status, await anon.json());
  server.close();
});
