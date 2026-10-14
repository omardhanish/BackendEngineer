import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE product (sku TEXT PRIMARY KEY, price_minor BIGINT NOT NULL);
  CREATE TABLE inventory (sku TEXT PRIMARY KEY, on_hand INT NOT NULL,
    reserved INT NOT NULL DEFAULT 0, CHECK (reserved <= on_hand));
  CREATE TABLE cart_item (user_id TEXT, sku TEXT REFERENCES product,
    qty INT NOT NULL, PRIMARY KEY (user_id, sku));
  CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL,
    status TEXT NOT NULL, total_minor BIGINT NOT NULL,
    idempotency_key TEXT NOT NULL, pay_by TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, idempotency_key));
  INSERT INTO product VALUES ('SKU-MUG', 49900), ('SKU-TEE', 79900);
  INSERT INTO inventory (sku, on_hand) VALUES ('SKU-MUG', 5), ('SKU-TEE', 1);
  INSERT INTO cart_item VALUES ('U-7', 'SKU-MUG', 2), ('U-7', 'SKU-TEE', 1),
    ('U-9', 'SKU-TEE', 1);`);
class AppError extends Error {
  constructor(status, code, extra) { super(code); Object.assign(this,
    { status, extra }); }
}
async function tx(fn) {                       // one transaction per call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const q = (sql) => (c, ...v) => c.query(sql, v);
const repo = {                                // SQL only: no HTTP, no rules
  lines: q(`SELECT sku, qty, price_minor FROM cart_item
    JOIN product USING (sku) WHERE user_id = $1 ORDER BY sku`),
  byKey: q('SELECT * FROM orders WHERE user_id = $1 AND idempotency_key = $2'),
  reserve: q(`UPDATE inventory SET reserved = reserved + $2
    WHERE sku = $1 AND on_hand - reserved >= $2`),
  insertOrder: q(`INSERT INTO orders VALUES (DEFAULT, $1, 'PENDING_PAYMENT',
    $2, $3, TIMESTAMPTZ '2026-01-15 10:15+00') RETURNING *`), // demo clock
  clear: q('DELETE FROM cart_item WHERE user_id = $1'),
};
const sum = (ls) => ls.reduce((s, l) => s + l.qty * Number(l.price_minor), 0);
const toJson = (o) => ({ id: `OR-${o.id}`, status: o.status,
  totalMinor: Number(o.total_minor), payBy: o.pay_by });
const service = {                             // business rules
  checkout: (user, key, shownTotal) => tx(async (c) => {
    const prior = (await repo.byKey(c, user, key)).rows[0];
    if (prior) return { replay: true, order: toJson(prior) };
    const ls = (await repo.lines(c, user)).rows;
    if (!ls.length) throw new AppError(409, 'CART_EMPTY');
    if (sum(ls) !== shownTotal)
      throw new AppError(409, 'PRICE_CHANGED', { totalMinor: sum(ls) });
    for (const l of ls)                       // already in SKU order
      if (!(await repo.reserve(c, l.sku, l.qty)).rowCount)
        throw new AppError(409, 'OUT_OF_STOCK', { sku: l.sku });
    const [o] = (await repo.insertOrder(c, user, sum(ls), key)).rows;
    await repo.clear(c, user);
    return { replay: false, order: toJson(o) };
  }),
};
const Checkout = z.object({ expectedTotalMinor: z.number().int().min(0) });
const userOf = (req) => req.get('x-user-id');  // demo: real apps use auth
const app = express().use(express.json());
app.post('/checkout', async (req, res) => {              // controller
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { expectedTotalMinor } = Checkout.parse(req.body);
  const r = await service.checkout(userOf(req), key, expectedTotalMinor);
  res.status(r.replay ? 200 : 201).json(r.order);
});
app.use((err, req, res, next) => {                       // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST'] : [500, 'INTERNAL'];
  res.status(status).json({ error, ...err.extra });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
for (const [method, path, user, body, key] of [
  ['POST', '/checkout', 'U-7', { expectedTotalMinor: 179700 }],
  ['POST', '/checkout', 'U-7', { expectedTotalMinor: '1797' }, 'k-1'],
  ['POST', '/checkout', 'U-7', { expectedTotalMinor: 99800 }, 'k-1'],
  ['POST', '/checkout', 'U-7', { expectedTotalMinor: 179700 }, 'k-1'],
  ['POST', '/checkout', 'U-7', { expectedTotalMinor: 179700 }, 'k-1'],
  ['POST', '/checkout', 'U-9', { expectedTotalMinor: 79900 }, 'k-2'],
]) {
  const r = await fetch(base + path, { method, body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-user-id': user,
      ...(key && { 'Idempotency-Key': key }) } });
  console.log(user, method, path, r.status, JSON.stringify(await r.json()));
}
srv.close(); await pool.end();
