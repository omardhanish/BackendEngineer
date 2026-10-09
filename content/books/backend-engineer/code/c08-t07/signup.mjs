import express from 'express';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// src/controllers/auth.controller.js
async function signup(req, res) {
  const { email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email });
  if (!user) return res.status(409).json({ error: 'Email already registered' });
  res.status(201).json({ user });
}

// Setup so this file runs alone: db, the users table, an app.
const db = drizzle(process.env.DATABASE_URL);
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
await db.execute(sql`create table users (
  id serial primary key, email text not null unique,
  password_hash text not null, created_at timestamp not null default now())`);
const app = express();
app.use(express.json());
app.post('/auth/signup', signup);

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/auth/signup`;
  const post = (body) => fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const creds = { email: 'ada@example.com', password: 'correct-horse' };
  for (let i = 0; i < 2; i++) {
    const res = await post(creds);
    console.log(res.status, JSON.stringify(await res.json()));
  }
  const [row] = await db.select().from(users);
  console.log('hash equals password:', row.passwordHash === creds.password);
  const ok = await bcrypt.compare(creds.password, row.passwordHash);
  console.log('password matches hash:', ok);
  server.close();
  await db.$client.end();
});
