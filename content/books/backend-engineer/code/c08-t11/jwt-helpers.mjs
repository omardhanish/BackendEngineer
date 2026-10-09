import jwt from 'jsonwebtoken';

// src/utils/jwt.js
export function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
}

// Setup so this file runs alone: a demo secret, never a real one.
process.env.JWT_SECRET = 'demo-secret';
const token = signToken({ id: 1, email: 'ada@example.com' });
const { sub, email, iat, exp } = verifyToken(token);
console.log(JSON.stringify({ sub, email }), exp - iat);

const forged = jwt.sign({ sub: '1' }, 'other-secret');
const expired = jwt.sign({ sub: '1' }, 'demo-secret', { expiresIn: -1 });
for (const bad of [forged, expired, 'garbage']) {
  try {
    verifyToken(bad);
  } catch (err) {
    console.log(err.name, '-', err.message);
  }
}
