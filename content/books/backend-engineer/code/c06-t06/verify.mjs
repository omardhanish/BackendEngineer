import jwt from 'jsonwebtoken';

const secret = 'demo-secret'; // a demo value: real secrets live in the env
const claims = { sub: '1', role: 'user' };
const token = jwt.sign(claims, secret, { expiresIn: '15m' });

console.log(jwt.verify(token, secret).role);

const check = (t, key) => {
  try { jwt.verify(t, key); } catch (err) { console.log(err.message); }
};
check(token, 'wrong-secret');
check(jwt.sign(claims, secret, { expiresIn: -1 }), secret);
check('garbage', secret);
