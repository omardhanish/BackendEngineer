import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE SEQUENCE pay_seq; CREATE TABLE payment (id TEXT
  PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, request TEXT NOT NULL,
  amount_minor BIGINT NOT NULL, status TEXT NOT NULL, refunded_minor BIGINT
  NOT NULL DEFAULT 0 CHECK (refunded_minor <= amount_minor));`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
const gateway = async (m) => m.token === 'tok_bad' ? 'FAILED' : 'SUCCEEDED';
const q = (sql, v, c = pool) => c.query(sql, v).then((r) => r.rows[0]);
const repo = {                                    // SQL only, no rules
  byKey: (key) => q('SELECT * FROM payment WHERE idempotency_key = $1', [key]),
  insert: (key, req, amount) => q(`INSERT INTO payment VALUES
    ('P-' || nextval('pay_seq'), $1, $2, $3, 'PROCESSING') RETURNING *`,
    [key, req, amount]),
  settle: (id, to) => q(`UPDATE payment SET status = $2
    WHERE id = $1 AND status = 'PROCESSING' RETURNING *`, [id, to]),
  lock: (c, id) => q('SELECT * FROM payment WHERE id = $1 FOR UPDATE', [id], c),
  addRefund: (c, id, amt) => q(`UPDATE payment SET refunded_minor =
    refunded_minor + $2, status = CASE WHEN refunded_minor + $2 =
    amount_minor THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END
    WHERE id = $1 RETURNING *`, [id, amt], c),
};
async function tx(fn) {                           // one transaction per call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const service = {                                 // business rules
  async pay(key, body) {
    const req = JSON.stringify(body), prior = await repo.byKey(key);
    if (prior && prior.request !== req)
      throw new AppError(422, 'KEY_REUSED');
    if (prior) return { replay: true, payment: prior };
    const row = await repo.insert(key, req, body.amountMinor); // 23505 if raced
    const outcome = await gateway(body.method);   // no open transaction here
    return { replay: false, payment: await repo.settle(row.id, outcome) };
  },
  refund: (id, amount) => tx(async (c) => {
    const p = await repo.lock(c, id);
    if (!p) throw new AppError(404, 'PAYMENT_NOT_FOUND');
    if (!['SUCCEEDED', 'PARTIALLY_REFUNDED'].includes(p.status))
      throw new AppError(409, 'NOT_REFUNDABLE');
    if (amount > Number(p.amount_minor) - Number(p.refunded_minor))
      throw new AppError(409, 'REFUND_EXCEEDS_BALANCE');
    return repo.addRefund(c, id, amount);
  }),
};
const Amount = z.object({ amountMinor: z.number().int().positive() });
const PayBody = Amount.extend({ orderId: z.string(), method: z.union([
    z.object({ type: z.literal('UPI'), vpa: z.string().regex(/^\S+@\w+$/) }),
    z.object({ type: z.literal('CARD'), token: z.string() })]) });
const toJson = (p) => ({ id: p.id, status: p.status,
  amountMinor: +p.amount_minor, refundedMinor: +p.refunded_minor });
const app = express().use(express.json());        // controllers
app.post('/payments', async (req, res) => {
  const key = z.string().min(1).parse(req.get('Idempotency-Key')); // 400
  const { replay, payment } = await service.pay(key, PayBody.parse(req.body));
  res.status(replay ? 200 : 201).json(toJson(payment));
});
app.post('/payments/:id/refunds', async (req, res) => {
  const { amountMinor: amt } = Amount.parse(req.body);
  res.status(201).json(toJson(await service.refund(req.params.id, amt)));
});
app.use((err, req, res, next) => {                // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'REQUEST_IN_PROGRESS'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function post(path, body, key = '') {
  const r = await fetch(base + path, { method: 'POST', body:
    JSON.stringify(body), headers: { 'content-type': 'application/json',
    'Idempotency-Key': key } });
  console.log(path, key || '-', r.status, JSON.stringify(await r.json()));
}
const upi = { orderId: 'ORD-1', amountMinor: 49900,
  method: { type: 'UPI', vpa: 'asha@okbank' } };
await post('/payments', upi, 'k-1');
await post('/payments', upi, 'k-1');
await post('/payments', { ...upi, amountMinor: 100 }, 'k-1');
await post('/payments', { orderId: 'ORD-2', amountMinor: 15000,
  method: { type: 'CARD', token: 'tok_bad' } }, 'k-2');
await post('/payments', { ...upi, amountMinor: -5 }, 'k-3');
await post('/payments/P-1/refunds', { amountMinor: 30000 });
await post('/payments/P-1/refunds', { amountMinor: 30000 });
srv.close(); await pool.end();
