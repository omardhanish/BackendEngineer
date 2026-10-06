import express from 'express';

const app = express();
app.use((req, res, next) => {
  console.log('logger:', req.url);
  next();
});
app.use(async (req, res) => {
  await Promise.resolve(); // pretend to look up a session
  throw new Error('session store is down');
});
app.get('/books', (req, res) => {
  console.log('handler runs');
  res.json([]);
});
app.use((err, req, res, next) => {
  console.log('error handler:', err.message);
  res.status(500).json({ error: 'internal error' });
});

const server = app.listen(0, async () => {
  const res = await fetch(`http://localhost:${server.address().port}/books`);
  console.log(res.status, await res.json());
  server.close();
});
