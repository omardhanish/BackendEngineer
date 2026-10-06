import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello from Express');
});

const server = app.listen(0, async (err) => {
  if (err) throw err;
  const res = await fetch(`http://localhost:${server.address().port}/`);
  console.log(res.status, await res.text());
  server.close();
});
