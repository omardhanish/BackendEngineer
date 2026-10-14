import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE product (id TEXT PRIMARY KEY,
    name TEXT NOT NULL, price_minor BIGINT NOT NULL CHECK (price_minor > 0));
  INSERT INTO product VALUES ('P-1', 'Masala tea', 2000),
    ('P-2', 'Filter coffee', 3500), ('P-3', 'Lassi', 5000);`);
class LruCache {          // a Map keeps insertion order: first = oldest
  #map = new Map(); stats = { hits: 0, misses: 0, evictions: 0 };
  constructor(capacity) { this.capacity = capacity; }
  get(key) {
    if (!this.#map.has(key)) { this.stats.misses++; return undefined; }
    const value = this.#map.get(key);
    this.#map.delete(key); this.#map.set(key, value);   // now newest
    this.stats.hits++; return value;
  }
  set(key, value) {
    this.#map.delete(key); this.#map.set(key, value);
    if (this.#map.size > this.capacity) {
      this.#map.delete(this.#map.keys().next().value);
      this.stats.evictions++;
    }
  }
  delete(key) { this.#map.delete(key); }
}
let dbReads = 0;
const repo = {
  find: async (id) => { dbReads++; return (await pool.query(
    'SELECT id, name, price_minor FROM product WHERE id = $1', [id])).rows[0];
  },
  setPrice: (id, p) => pool.query(
    'UPDATE product SET price_minor = $2 WHERE id = $1', [id, p]),
};
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
const cache = new LruCache(2), inflight = new Map();
const service = {
  async get(id) {
    const hit = cache.get(id);
    if (hit) return { ...hit, source: 'cache' };
    if (!inflight.has(id)) inflight.set(id, repo.find(id).then((row) => {
      const p = row && { id, name: row.name, priceMinor: +row.price_minor };
      if (p) cache.set(id, p);              // never cache a miss here
      return p;
    }).finally(() => inflight.delete(id)));  // one DB read per cold key
    const product = await inflight.get(id);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND');
    return { ...product, source: 'db' };
  },
  async setPrice(id, priceMinor) {
    const { rowCount } = await repo.setPrice(id, priceMinor);
    if (!rowCount) throw new AppError(404, 'PRODUCT_NOT_FOUND');
    cache.delete(id);                       // write the DB, then invalidate
  },
};
const app = express().use(express.json());
app.get('/products/:id', async (req, res) => {
  res.json(await service.get(req.params.id));
});
app.put('/products/:id/price', async (req, res) => {
  const { priceMinor } = z.object({ priceMinor: z.number().int().positive() })
    .parse(req.body);
  await service.setPrice(req.params.id, priceMinor);
  res.status(204).end();
});
app.get('/cache/stats', (req, res) => res.json({ ...cache.stats, dbReads }));
app.use((err, req, res, next) => {
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function call(method, path, body) {
  const r = await fetch(base + path, { method, body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' } });
  console.log(method, path, r.status, await r.text());
}
await call('GET', '/products/P-1');
await call('GET', '/products/P-1');
await call('PUT', '/products/P-1/price', { priceMinor: -5 });
await call('PUT', '/products/P-1/price', { priceMinor: 2200 });
await call('GET', '/products/P-1');
await call('GET', '/products/P-9');
await call('GET', '/products/P-2');
await call('GET', '/products/P-3');
await call('GET', '/cache/stats');
const before = dbReads;                     // three readers, one cold key
await Promise.all([1, 2, 3].map(() => fetch(base + '/products/P-1')));
console.log('DB reads for 3 parallel cold GETs:', dbReads - before);
srv.close(); await pool.end();
