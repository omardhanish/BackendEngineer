import express from 'express';

const app = express();
app.use(express.json());
app.post('/api/v1/auth/register', (req, res) => {
  console.log(req.get('content-type'), req.body);
  res.status(201).json({ received: true });
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/api/v1/auth/register`;
  const send = (type) => fetch(url, {
    method: 'POST',
    headers: { 'content-type': type },
    body: JSON.stringify({ username: 'ada' }),
  });
  await send('application/json');
  await send('text/plain');
  server.close();
});
