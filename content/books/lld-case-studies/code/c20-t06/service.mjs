import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE SEQUENCE order_seq;
  CREATE TABLE orders (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    idempotency_key TEXT NOT NULL UNIQUE);
  CREATE TABLE outbox (id BIGSERIAL PRIMARY KEY, topic TEXT NOT NULL,
    event_key TEXT NOT NULL, payload JSONB NOT NULL, published_at TIMESTAMPTZ);
  CREATE INDEX outbox_unpublished ON outbox (id) WHERE published_at IS NULL;
  CREATE TABLE processed_event (subscriber TEXT, event_id BIGINT,
    PRIMARY KEY (subscriber, event_id));
  CREATE TABLE loyalty (customer_id TEXT PRIMARY KEY, points BIGINT NOT NULL);
  INSERT INTO loyalty VALUES ('C-1', 0);`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
const subscribers = new Map();               // in-process bus: topic -> fns
const subscribe = (topic, fn) =>
  subscribers.set(topic, [...(subscribers.get(topic) ?? []), fn]);
async function createOrder(key, { customerId, amountMinor }) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const old = await c.query('SELECT id, customer_id, amount_minor FROM'
      + ' orders WHERE idempotency_key = $1', [key]);
    if (old.rowCount) {                      // replay: same answer, no event
      const o = old.rows[0];
      if (o.customer_id !== customerId || +o.amount_minor !== amountMinor)
        throw new AppError(422, 'KEY_REUSED');
      await c.query('COMMIT');
      return { status: 200, order: { id: o.id, customerId, amountMinor } };
    }
    const { rows: [o] } = await c.query(`INSERT INTO orders VALUES
      ('OR-' || nextval('order_seq'), $1, $2, $3) RETURNING id`,
      [customerId, amountMinor, key]);
    await c.query(`INSERT INTO outbox (topic, event_key, payload)
      VALUES ('orders', $1, $2)`, [o.id, { type: 'order.placed',
      orderId: o.id, customerId, amountMinor }]);
    await c.query('COMMIT');                 // order and event, or neither
    return { status: 201, order: { id: o.id, customerId, amountMinor } };
  } catch (err) { await c.query('ROLLBACK'); throw err; }
  finally { c.release(); }
}
async function relayOnce({ crashBeforeMark = false } = {}) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(`SELECT id, topic, payload FROM outbox
      WHERE published_at IS NULL ORDER BY id LIMIT 100
      FOR UPDATE SKIP LOCKED`);
    for (const r of rows)            // id order; commit order may differ
      for (const fn of subscribers.get(r.topic) ?? [])
        await fn({ id: Number(r.id), ...r.payload });
    if (crashBeforeMark) throw new Error('relay crashed');
    await c.query('UPDATE outbox SET published_at = now() WHERE id = ANY($1)',
      [rows.map((r) => r.id)]);
    await c.query('COMMIT');
    return rows.length;
  } catch (err) { await c.query('ROLLBACK'); throw err; }
  finally { c.release(); }
}
subscribe('orders', async (e) => console.log(`email: ${e.orderId} placed`));
subscribe('orders', async (e) => {          // inbox row + effect, one tx
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const fresh = await c.query(`INSERT INTO processed_event VALUES
      ('loyalty', $1) ON CONFLICT DO NOTHING`, [e.id]);
    if (fresh.rowCount) await c.query('UPDATE loyalty SET points = points'
      + ' + $2 WHERE customer_id = $1',        // BIGINT: whole points only
      [e.customerId, Math.floor(e.amountMinor / 100)]);
    else console.log(`loyalty: skip duplicate event ${e.id}`);
    await c.query('COMMIT');
  } catch (err) { await c.query('ROLLBACK'); throw err; }
  finally { c.release(); }
});
const Body = z.object({ customerId: z.string().min(1),
  amountMinor: z.number().int().positive() });
const app = express().use(express.json());
app.post('/orders', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { status, order } = await createOrder(key, Body.parse(req.body));
  res.status(status).json(order);
});
app.use((err, req, res, next) => {
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'DUPLICATE'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function post(key, body) {
  const headers = { 'content-type': 'application/json' };
  if (key) headers['idempotency-key'] = key;
  const r = await fetch(base + '/orders', { method: 'POST', headers,
    body: JSON.stringify(body) });
  console.log('POST /orders', key ?? '-', r.status, await r.text());
}
await post('k-1', { customerId: 'C-1', amountMinor: 25000 });
await post('k-1', { customerId: 'C-1', amountMinor: 25000 });
await post('k-1', { customerId: 'C-1', amountMinor: 99 });
await post(null, { customerId: 'C-1', amountMinor: 100 });
await post('k-2', { customerId: 'C-1', amountMinor: -5 });
await post('k-3', { customerId: 'C-1', amountMinor: 12000 });
await relayOnce({ crashBeforeMark: true }).catch((e) => console.log(e.message));
console.log('relay published', await relayOnce());
console.log('relay published', await relayOnce());
const { rows: [l] } = await pool.query(
  'SELECT points FROM loyalty WHERE customer_id = $1', ['C-1']);
console.log('C-1 loyalty points:', Number(l.points));
srv.close(); await pool.end();
