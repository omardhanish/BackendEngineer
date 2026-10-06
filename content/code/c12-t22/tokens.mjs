import jwt from 'jsonwebtoken';

// Demo values; the project reads real secrets from .env.
const ACCESS_SECRET = 'demo-access-secret';
const REFRESH_SECRET = 'demo-refresh-secret';
const claims = { _id: 'u-101' };

const access = jwt.sign(claims, ACCESS_SECRET, { expiresIn: '15m' });
const refresh = jwt.sign(claims, REFRESH_SECRET, { expiresIn: '7d' });

const seconds = (t) => jwt.decode(t).exp - jwt.decode(t).iat;
console.log('lifetimes:', seconds(access), seconds(refresh));

try {
  jwt.verify(refresh, ACCESS_SECRET);
} catch (err) {
  console.log('refresh as access:', err.message);
}
console.log('refresh as refresh:', jwt.verify(refresh, REFRESH_SECRET)._id);
