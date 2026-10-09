import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// src/validation/auth.validation.js
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required'),
});

// src/services/user.service.js
export async function verifyCredentials({ email, password }) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return null;
  const match = await bcrypt.compare(password, user.passwordHash);
  return match ? { id: user.id, email: user.email } : null;
}

// src/controllers/auth.controller.js
const badRequest = (res, { issues }) => res.status(400).json({
  error: 'Validation failed',
  issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const user = await verifyCredentials(parsed.data);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign(
    { sub: String(user.id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
  res.json({ token });
}

// Setup so this file runs alone: a demo secret, db, the users table, Ada.
process.env.JWT_SECRET = 'demo-secret'; // a demo value, never a real secret
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
const ada = { email: 'ada@example.com', password: 'correct-horse' };
await db.insert(users).values({
  email: ada.email,
  passwordHash: await bcrypt.hash(ada.password, 10),
});
const app = express();
app.use(express.json());
app.post('/auth/login', login);

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/auth/login`;
  const post = async (body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return [res.status, await res.json()];
  };
  const [status, { token }] = await post(ada);
  const { sub, email, iat, exp } = jwt.verify(token, process.env.JWT_SECRET);
  console.log(status, JSON.stringify({ sub, email }), exp - iat);
  const wrongPassword = { ...ada, password: 'wrong-password' };
  const noSuchUser = { ...ada, email: 'bob@example.com' };
  for (const body of [wrongPassword, noSuchUser, { email: ada.email }]) {
    const [code, json] = await post(body);
    console.log(code, JSON.stringify(json));
  }
  server.close();
  await db.$client.end();
});
