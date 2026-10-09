import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';

const SECRET = 'acme-demo-secret';
const sha = (text) => createHash('sha256').update(text).digest('hex');

const users = [
  { id: 1, email: 'ada@acme.test', hash: sha('ada-pw'), role: 'user' },
  { id: 2, email: 'root@acme.test', hash: sha('root-pw'), role: 'admin' },
];

const app = express();
app.use(express.json());
app.use(cookieParser());

app.post('/register', (req, res) => {
  const { email, password, role } = req.body;
  const user = { id: users.length + 1, email, hash: sha(password),
    role: role || 'user' };
  users.push(user);
  res.status(201).json({ id: user.id });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: 'No account for ' + email });
  if (user.hash !== sha(password)) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
  res.cookie('token', token);
  res.json({ message: 'Welcome back', user });
});

const auth = (req, res, next) => {
  try {
    req.user = jwt.verify(req.cookies.token, SECRET);
  } catch {
    return res.status(401).json({ error: 'Please log in' });
  }
  next();
};

app.get('/me', auth, (req, res) => res.json(req.user));
app.get('/admin/users', auth, (req, res) => res.json(users));

app.listen(3000);
