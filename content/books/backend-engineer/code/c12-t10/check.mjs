import app from './app.js';

const server = app.listen(0, async () => {
  const res = await fetch(`http://localhost:${server.address().port}/`);
  console.log(res.status, await res.text());
  server.close();
});
