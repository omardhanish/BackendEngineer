import http from 'node:http';

let visits = 0;
const server = http.createServer((req, res) => {
  visits += 1;
  res.end(`visit ${visits}`);
});

server.listen(0, async () => {
  const url = `http://localhost:${server.address().port}`;
  console.log(await (await fetch(url)).text());
  console.log(await (await fetch(url)).text());
  server.close();
});
