import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// src/validation/auth.validation.js
export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// src/services/user.service.js
export async function createUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email });
  return user ?? null;
}

// src/controllers/auth.controller.js
const badRequest = (res, { issues }) => res.status(400).json({
  error: 'Validation failed',
  issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});

export async function signup(req, res) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const user = await createUser(parsed.data);
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
await db.$client.query(`create table users (
  id serial primary key, email text not null unique,
  password_hash text not null, created_at timestamp not null default now())`);
const app = express();
app.use(express.json());
app.post('/auth/signup', signup);

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/auth/signup`;
  const creds = { email: 'ada@example.com', password: 'correct-horse' };
  for (const body of [creds, creds, { email: creds.email }]) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log(res.status, JSON.stringify(await res.json()));
  }
  const grace = { email: 'grace@example.com', password: 'correct-horse' };
  console.log('no HTTP needed:', (await createUser(grace)).email);
  server.close();
  await db.$client.end();
});
