import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';

const hash = bcrypt.hashSync('demo-password', 10);
const users = [{ id: 1, email: 'ada@example.com', passwordHash: hash }];
const sessions = new Map(); // session id -> { userId }

const app = express();
app.use(express.json(), cookieParser());

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const sid = crypto.randomUUID();
  sessions.set(sid, { userId: user.id });
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
  res.json({ email: user.email });
});

app.get('/me', (req, res) => {
  const session = sessions.get(req.cookies.sid);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  res.json({ userId: session.userId });
});

app.post('/logout', (req, res) => {
  sessions.delete(req.cookies.sid);
  res.clearCookie('sid');
  res.status(204).end();
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, path, { cookie = '', body } = {}) => {
    const headers = { 'content-type': 'application/json', cookie };
    const init = { method, headers, body: body && JSON.stringify(body) };
    const res = await fetch(base + path, init);
    console.log(method, path, res.status, await res.text());
    return res.headers.get('set-cookie');
  };
  await call('GET', '/me');
  const body = { email: 'ada@example.com', password: 'demo-password' };
  const setCookie = await call('POST', '/login', { body });
  console.log(setCookie.replace(/sid=[^;]+/, 'sid=<id>'));
  const cookie = setCookie.split(';')[0]; // what the browser sends back
  await call('GET', '/me', { cookie });
  await call('POST', '/logout', { cookie });
  await call('GET', '/me', { cookie });
  server.close();
});
