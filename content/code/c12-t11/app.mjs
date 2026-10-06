import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const origin = process.env.CORS_ORIGIN?.split(',');
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());
app.post('/echo', (req, res) => {
  res.json({ body: req.body, cookies: req.cookies });
});

const server = app.listen(0, async () => {
  const res = await fetch(`http://localhost:${server.address().port}/echo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'sid=demo' },
    body: JSON.stringify({ email: 'ada@example.com' }),
  });
  console.log(await res.json());
  server.close();
});
