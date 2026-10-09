import http from 'node:http';

const payments = http.createServer((req, res) => res.end('paid'));
await new Promise((resolve) => payments.listen(0, resolve));
const url = `http://127.0.0.1:${payments.address().port}`;

const place = async () => {
  try { return 'order ' + (await (await fetch(url)).text()); }
  catch { return 'order failed: payments unreachable'; }
};
console.log(await place());
await new Promise((resolve) => payments.close(resolve));
console.log(await place());
