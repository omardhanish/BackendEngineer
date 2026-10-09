import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// A demo value. Real secrets come from the environment, never from code.
const SECRET = 'demo-secret';
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
}));

const authenticate = async (req, res, next) => {
  let sub;
  try {
    const token = req.get('authorization')?.replace('Bearer ', '');
    ({ sub } = jwt.verify(token, SECRET, { algorithms: ['HS256'] }));
  } catch {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }
  req.user = await User.findById(sub).select('email');
  if (!req.user) return res.status(401).json({ error: 'Unknown user' });
  next();
};

const app = express();
app.use(express.json());
app.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Send email and password as text' });
  }
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  res.json({ token: jwt.sign({ sub: user.id }, SECRET, { expiresIn: '1h' }) });
});
app.get('/me', authenticate, (req, res) => res.json({ email: req.user.email }));

await mongoose.connect(process.env.MONGO_URI);
const passwordHash = await bcrypt.hash('demo-password', 10);
const ada = await User.create({ email: 'ada@example.com', passwordHash });

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (label, path, { token, body } = {}) => {
    const res = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        'content-type': 'application/json',
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const shown = data.token ? '(token)' : JSON.stringify(data);
    console.log(label, res.status, shown);
    return data.token;
  };
  const creds = { email: 'ada@example.com', password: 'demo-password' };
  await call('no token', '/me');
  const operator = { ...creds, email: { $ne: null } };
  await call('operator', '/login', { body: operator });
  const token = await call('login', '/login', { body: creds });
  await call('with token', '/me', { token });
  await User.deleteOne({ _id: ada.id });
  await call('deleted user', '/me', { token });
  server.close();
  await mongoose.disconnect();
});
