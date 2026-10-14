import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE account (id TEXT PRIMARY KEY,
    balance_minor BIGINT NOT NULL CHECK (balance_minor >= 0));
  CREATE TABLE atm_session (id SERIAL PRIMARY KEY, account_id TEXT);
  CREATE TABLE atm_tx (id SERIAL PRIMARY KEY, account_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL, amount_minor BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    UNIQUE (account_id, idempotency_key));
  INSERT INTO account VALUES ('AC-1', 500000);
  INSERT INTO atm_session (account_id) VALUES ('AC-1');`);  // PIN: pin.mjs
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                 // one transaction per service call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const q = (c, sql, ...v) => c.query(sql, v).then((r) => r.rows[0]);
const repo = {                          // SQL only: no HTTP, no rules
  session: (c, id) => q(c, 'SELECT * FROM atm_session WHERE id = $1', id),
  lock: (c, a) => q(c, 'SELECT * FROM account WHERE id = $1 FOR UPDATE', a),
  byKey: (c, a, k) => q(c, `SELECT * FROM atm_tx WHERE account_id = $1
    AND idempotency_key = $2`, a, k),
  move: (c, a, amt) => q(c, `UPDATE account SET balance_minor =
    balance_minor + $2 WHERE id = $1 RETURNING balance_minor`, a, amt),
  insert: (c, a, k, amt) => q(c, `INSERT INTO atm_tx (account_id,
    idempotency_key, amount_minor) VALUES ($1, $2, $3) RETURNING *`, a, k, amt),
  reverse: (c, id) => q(c, `UPDATE atm_tx SET status = 'REVERSED'
    WHERE id = $1 AND status = 'PENDING' RETURNING *`, id),
};
const view = (t, bal) => ({ txId: `TX-${t.id}`, status: t.status,
  amountMinor: +t.amount_minor, balanceMinor: +bal });
const idOf = (s) => Number(s.split('-')[1]) || 0;    // 'S-1' -> 1
const service = {                       // business rules, one transaction
  withdraw: (key, sessionId, amount) => tx(async (c) => {
    const s = await repo.session(c, idOf(sessionId));
    if (!s) throw new AppError(404, 'SESSION_NOT_FOUND');
    const acc = await repo.lock(c, s.account_id);   // serialise per account
    const prior = await repo.byKey(c, acc.id, key);  // keys are per account
    if (prior && +prior.amount_minor !== amount)
      throw new AppError(422, 'KEY_REUSED');
    if (prior) return { replay: true, body: view(prior, acc.balance_minor) };
    if (+acc.balance_minor < amount)
      throw new AppError(409, 'INSUFFICIENT_FUNDS');
    const { balance_minor } = await repo.move(c, acc.id, -amount);
    const t = await repo.insert(c, acc.id, key, amount);
    return { replay: false, body: view(t, balance_minor) };
  }),
  reverse: (txId) => tx(async (c) => {  // the cash never left the ATM
    const t = await repo.reverse(c, idOf(txId));
    if (!t) throw new AppError(409, 'NOT_PENDING');
    const { balance_minor } = await repo.move(c, t.account_id, +t.amount_minor);
    return view(t, balance_minor);
  }),
};
const Withdraw = z.object({ sessionId: z.string(), amountMinor: z.number()
  .int().positive().multipleOf(10000).max(1000000) });
const app = express().use(express.json());
app.post('/withdrawals', async (req, res) => {          // controllers
  const key = z.string().min(1).parse(req.get('Idempotency-Key'));
  const { sessionId, amountMinor } = Withdraw.parse(req.body);
  const { replay, body } = await service.withdraw(key, sessionId, amountMinor);
  res.status(replay ? 200 : 201).json(body);
});
app.post('/withdrawals/:id/reverse', async (req, res) =>
  res.json(await service.reverse(req.params.id)));
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
const post = async (path, body, key = '') => {
  const h = { 'content-type': 'application/json', 'Idempotency-Key': key };
  const r = await fetch(base + path, { method: 'POST', headers: h,
    body: JSON.stringify(body) });
  console.log(path, r.status, JSON.stringify(await r.json()));
};
const w = (amountMinor) => ({ sessionId: 'S-1', amountMinor });
await post('/withdrawals', w(250000), 'k-1');
await post('/withdrawals', w(250000), 'k-1');
await post('/withdrawals', w(100000), 'k-1');
await post('/withdrawals', w(25050), 'k-2');
await post('/withdrawals', w(900000), 'k-3');
await post('/withdrawals/TX-1/reverse');
await post('/withdrawals/TX-1/reverse');
srv.close(); await pool.end();
