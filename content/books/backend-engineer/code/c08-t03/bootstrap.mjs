import express from 'express';

// Setup so this file runs alone: PORT=0 asks the system for a free port.
process.env.PORT = '0';

// src/app.js
const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// src/server.js
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log('Server is up'));

// Setup: call the running app once, then stop it.
server.on('listening', async () => {
  const url = `http://localhost:${server.address().port}`;
  const res = await fetch(`${url}/health`);
  console.log(res.status, JSON.stringify(await res.json()));
  server.close();
});
