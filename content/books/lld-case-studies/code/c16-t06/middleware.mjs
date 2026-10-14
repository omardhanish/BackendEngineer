import express from 'express';

class TokenBucketLimiter {             // milli-tokens, as on the Java page
  constructor({ capacity, perSecond, clock }) {
    Object.assign(this, { capacity: capacity * 1000, perSecond, clock });
    this.buckets = new Map();          // key -> { tokens, last }
  }
  tryAcquire(key) {
    const now = this.clock();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, last: now };
    const refill = (now - b.last) * this.perSecond; // ms x tokens/s
    b.tokens = Math.min(this.capacity, b.tokens + refill);
    b.last = now;
    this.buckets.set(key, b);          // one thread: no race between lines
    if (b.tokens >= 1000) {
      b.tokens -= 1000;
      return { allowed: true, remaining: Math.floor(b.tokens / 1000) };
    }
    const waitMs = Math.ceil((1000 - b.tokens) / this.perSecond);
    return { allowed: false, remaining: 0, retryAfterMs: waitMs };
  }
}

function rateLimit(limiter, keyOf) {   // Express middleware factory
  return (req, res, next) => {
    const d = limiter.tryAcquire(keyOf(req));
    res.set('X-RateLimit-Remaining', String(d.remaining));
    if (d.allowed) return next();
    res.set('Retry-After', String(Math.ceil(d.retryAfterMs / 1000)));
    res.status(429).json({ error: 'RATE_LIMITED' });
  };
}

let now = 0;                           // demo clock: stable output
const limiter = new TokenBucketLimiter({
  capacity: 3, perSecond: 1, clock: () => now });
const app = express();
app.use('/api', rateLimit(limiter, (req) => req.get('X-Api-Key') ?? req.ip));
app.get('/api/search', (req, res) => res.json({ results: ['r1', 'r2'] }));

const srv = app.listen(0);
const base = `http://localhost:${srv.address().port}`;
async function call(apiKey) {
  const r = await fetch(`${base}/api/search`, {
    headers: { 'X-Api-Key': apiKey } });
  const ra = r.headers.get('retry-after');
  const left = r.headers.get('x-ratelimit-remaining');
  const extra = ra ? ` retry-after=${ra}s` : '';
  console.log(`t=${now} ${apiKey} ${r.status} remaining=${left}${extra}`,
    JSON.stringify(await r.json()));
}
for (let i = 0; i < 4; i++) await call('key-A');
await call('key-B');
now = 1000;
await call('key-A');
srv.close();
