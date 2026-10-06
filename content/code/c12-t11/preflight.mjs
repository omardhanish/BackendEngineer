import express from 'express';
import cors from 'cors';

process.env.CORS_ORIGIN = 'https://app.example'; // demo value, normally in .env

const app = express();
const origin = process.env.CORS_ORIGIN?.split(',');
app.use(cors({ origin, credentials: true }));
app.post('/echo', (req, res) => res.json({ ok: true }));

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/echo`;
  for (const from of ['https://app.example', 'https://other.example']) {
    const headers = { origin: from, 'access-control-request-method': 'POST' };
    const res = await fetch(url, { method: 'OPTIONS', headers });
    const allow = res.headers.get('access-control-allow-origin');
    console.log(from, res.status, allow);
  }
  server.close();
});
