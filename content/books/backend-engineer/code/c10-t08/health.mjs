import express from 'express';

const app = express();
app.get('/books', (req, res) => res.json([]));
app.get('/health', (req, res) => res.sendStatus(200));

const server = app.listen(0, '0.0.0.0', async () => {
  const { address, port } = server.address();
  console.log('bound to', address);
  for (const path of ['/', '/health']) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    console.log('GET', path, res.status);
  }
  server.close();
});
