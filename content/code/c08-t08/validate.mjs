import express from 'express';
import { z } from 'zod';

// src/controllers/auth.controller.js
const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const badRequest = (res, { issues }) => res.status(400).json({
  error: 'Validation failed',
  issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});

async function signup(req, res) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const user = await hashAndInsert(parsed.data);
  res.status(201).json({ user });
}

// Setup so this file runs alone. hashAndInsert stands in for lecture 7.
let inserts = 0;
const hashAndInsert = async ({ email }) => ({ id: ++inserts, email });
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
  const bodies = [
    { email: 'ada@example.com', password: 'correct-horse' },
    { email: 'not-an-email', password: 'correct-horse' },
    { email: 'ada@example.com', password: 'short' },
    { email: 'ada@example.com' },
  ];
  for (const body of bodies) {
    const res = await post(body);
    console.log(res.status, JSON.stringify(await res.json()));
  }
  console.log('inserts that ran:', inserts);
  server.close();
});
