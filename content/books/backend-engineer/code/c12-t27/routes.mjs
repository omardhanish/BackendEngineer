import express, { Router } from 'express';

// src/controllers/auth.controllers.js: a stand-in for the last lesson
const registerUser = (req, res) => {
  res.status(201).json({ received: req.body.username });
};

// src/routes/auth.routes.js
const router = Router();
router.route('/register').post(registerUser);

// src/app.js
const app = express();
app.use(express.json());
app.use('/api/v1/auth', router);

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, path) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'POST' ? JSON.stringify({ username: 'ada' }) : undefined,
    });
    console.log(method, path, res.status);
  };
  await call('POST', '/api/v1/auth/register');
  await call('GET', '/api/v1/auth/register');
  await call('POST', '/api/v1/register');
  server.close();
});
