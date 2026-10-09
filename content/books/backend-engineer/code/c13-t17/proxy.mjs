import express from 'express';

const app = express();
app.set('trust proxy', 1); // one reverse proxy sits in front of this app
app.get('/', (req, res) => res.send(`client: ${req.ip}`));

const server = app.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/`;
  // the header a reverse proxy sets when it forwards a request
  const headers = { 'x-forwarded-for': '203.0.113.7' };
  console.log(await (await fetch(url, { headers })).text());
  server.close();
});
