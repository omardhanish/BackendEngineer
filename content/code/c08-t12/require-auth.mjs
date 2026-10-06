import express from 'express';
import jwt from 'jsonwebtoken';

// src/utils/jwt.js (lecture 11)
const signToken = (user) => jwt.sign(
  { sub: String(user.id), email: user.email },
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '1h' },
);
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],
});

// src/middleware/auth.middleware.js
const unauthorized = (res) => res.status(401).json({ error: 'Unauthorized' });

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return unauthorized(res);
  let claims;
  try {
    claims = verifyToken(token);
  } catch {
    return unauthorized(res);
  }
  const id = Number(claims.sub);
  if (!Number.isInteger(id)) return unauthorized(res);
  req.user = { id, email: claims.email };
  next();
}

// Setup so this file runs alone: a demo secret and a stand-in route.
process.env.JWT_SECRET = 'demo-secret';
let hits = 0;
const app = express();
app.get('/whoami', requireAuth, (req, res) => {
  hits++;
  res.json({ user: req.user });
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/whoami`;
  const good = signToken({ id: 7, email: 'ada@example.com' });
  const expired = jwt.sign({ sub: '7' }, 'demo-secret', { expiresIn: -1 });
  const requests = {
    'no header': {},
    'valid token': { authorization: `Bearer ${good}` },
    'wrong scheme': { authorization: `Basic ${good}` },
    'expired token': { authorization: `Bearer ${expired}` },
  };
  for (const [name, headers] of Object.entries(requests)) {
    const res = await fetch(url, { headers });
    console.log(name, res.status, JSON.stringify(await res.json()));
  }
  console.log('handler ran:', hits);
  server.close();
});
