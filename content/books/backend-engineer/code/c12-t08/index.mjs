import express from 'express';

const app = express();
const port = process.env.PORT ?? 0;

app.get('/', (req, res) => res.send('auth-backend is running'));

const server = app.listen(port, async (err) => {
  if (err) throw err;
  console.log('listening');
  const base = `http://localhost:${server.address().port}`;
  const hit = await fetch(base);
  console.log(hit.status, await hit.text());
  console.log((await fetch(`${base}/nope`)).status);
  server.close();
});
