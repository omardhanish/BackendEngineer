import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

let calls = 0;
const inventory = http.createServer((req, res) => {
  if (++calls > 1) res.end('in stock'); // the first call never replies
});
await new Promise((resolve) => inventory.listen(0, resolve));
const url = `http://localhost:${inventory.address().port}/stock/42`;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(200) });
    console.log('attempt', attempt, await res.text());
    break;
  } catch (err) {
    console.log('attempt', attempt, err.name);
    await sleep(100 * 2 ** attempt); // wait longer after each failure
  }
}
inventory.close();
inventory.closeAllConnections();
