import express from 'express';

// A downstream service that fails on purpose.
const app = express();
app.use(express.json());
let flakyHits = 0;
app.get('/flaky', (req, res) => {
  flakyHits += 1;
  if (flakyHits <= 2) return res.status(503).json({ error: 'BUSY' });
  res.json({ ok: true, hits: flakyHits });
});
app.get('/slow', (req, res) => {
  const timer = setTimeout(() => res.json({ ok: true }), 500);
  res.on('close', () => clearTimeout(timer));
});
const byKey = new Map();                 // Idempotency-Key -> charge
const seenOrders = new Set();
let created = 0;
app.post('/charges', (req, res) => {
  const key = req.get('Idempotency-Key');
  if (key && byKey.has(key)) return res.status(200).json(byKey.get(key));
  created += 1;
  const charge = { id: `CH-${created}`, amountMinor: req.body.amountMinor };
  if (key) byKey.set(key, charge);
  const first = !seenOrders.has(req.body.orderRef);
  seenOrders.add(req.body.orderRef);
  if (first) return res.status(503).json({ error: 'REPLY_LOST' });
  res.status(201).json(charge);
});

// The client: retry transient failures of safe requests only.
function seeded(seed) {                  // small PRNG: same jitter every run
  return () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32;
}
const SAFE = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);
const TRANSIENT = new Set([502, 503, 504, 'TIMEOUT']);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createApiClient({ baseUrl, maxAttempts, baseMs, timeoutMs, random }) {
  return async (method, path, { body, idempotencyKey } = {}) => {
    const safe = SAFE.has(method) || Boolean(idempotencyKey);
    const headers = { 'content-type': 'application/json' };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    console.log(`${method} ${path}`);
    for (let attempt = 1; ; attempt += 1) {
      let result;
      try {
        const res = await fetch(baseUrl + path, {
          method, headers, body: body && JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs) });
        result = { status: res.status, body: await res.json() };
      } catch (err) {
        if (err.name !== 'TimeoutError') throw err;
        result = { status: 'TIMEOUT' };
      }
      console.log(`  #${attempt} ${result.status}`);
      const retry = TRANSIENT.has(result.status) && safe;
      if (!retry || attempt >= maxAttempts) return result;
      const exp = baseMs * 2 ** (attempt - 1);
      const wait = Math.round(exp / 2 + (random() * exp) / 2);
      console.log(`  wait ${wait}ms`);
      await sleep(wait);
    }
  };
}

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const call = createApiClient({
  baseUrl: `http://127.0.0.1:${server.address().port}`,
  maxAttempts: 3, baseMs: 20, timeoutMs: 100, random: seeded(42),
});
const show = (r) => console.log('  ->', r.status, JSON.stringify(r.body ?? {}));
show(await call('GET', '/flaky'));
show(await call('GET', '/slow'));
show(await call('POST', '/charges', {
  body: { orderRef: 'A', amountMinor: 4999 }, idempotencyKey: 'pay-A' }));
show(await call('POST', '/charges', {
  body: { orderRef: 'B', amountMinor: 1500 } }));
console.log('charges created on the server:', created);
server.closeAllConnections();
server.close();
