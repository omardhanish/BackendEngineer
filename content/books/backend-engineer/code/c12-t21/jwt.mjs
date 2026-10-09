import jwt from 'jsonwebtoken';

const secret = 'demo-secret'; // a demo value; the project keeps it in .env
const token = jwt.sign({ _id: 'u-101', username: 'ada' }, secret, {
  expiresIn: '15m',
});

const [header, payload] = token.split('.');
const read = (part) => JSON.parse(Buffer.from(part, 'base64url').toString());
console.log(read(header));
console.log(Object.keys(read(payload)));

const claims = jwt.verify(token, secret);
console.log(claims.username, claims.exp - claims.iat);
