import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE notification (id BIGSERIAL PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'SMS', 'PUSH')),
  recipient TEXT NOT NULL, body TEXT NOT NULL, provider TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'FAILED')));
  CREATE INDEX notification_pending ON notification (id)
    WHERE status = 'PENDING';`);
const templates = { otp: 'Your code is {{code}}', ship: 'Order {{id}} sent' };
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
const render = (t, params) => t.replace(/\{\{(\w+)}}/g, (_, k) => {
  if (params[k] === undefined) throw new AppError(400, `MISSING_PARAM_${k}`);
  return params[k];
});
const toJson = (r) => ({ id: `N-${r.id}`, status: r.status,
  provider: r.provider });
const service = { async accept(key, b) {  // key first, then render
  const old = await pool.query(
    'SELECT * FROM notification WHERE idempotency_key = $1', [key]);
  if (old.rowCount) return { replay: true, row: old.rows[0] };
  const body = render(templates[b.template], b.params);
  const ins = await pool.query(`INSERT INTO notification (idempotency_key,
    user_id, channel, recipient, body) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
    [key, b.userId, b.channel, b.to, body]);
  if (ins.rowCount) return { replay: false, row: ins.rows[0] };
  return this.accept(key, b); } };  // lost a race: now the SELECT finds it
const providers = { SMS: ['sms-a', 'sms-b'], EMAIL: ['mail-a'], PUSH: [] };
const down = new Set(['sms-a']), calls = {};       // sms-a has an outage
const fakeSend = (p) => (calls[p] = (calls[p] ?? 0) + 1) && !down.has(p);
async function worker() {               // claims one PENDING row at a time
  for (;;) {
    const c = await pool.connect();
    try { await c.query('BEGIN');
      const { rows: [n] } = await c.query(`SELECT * FROM notification
        WHERE status = 'PENDING' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!n) { await c.query('COMMIT'); return; }
      const winner = providers[n.channel].find((p) => fakeSend(p));
      await c.query('UPDATE notification SET status = $2, provider = $3 '
        + 'WHERE id = $1', [n.id, winner ? 'SENT' : 'FAILED', winner]);
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
}
const Body = z.object({ userId: z.string(), to: z.string().min(3),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH']), template: z.enum(['otp', 'ship']),
  params: z.record(z.string(), z.string()) });
const app = express().use(express.json());
app.post('/notifications', async (req, res) => {        // controllers
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { replay, row } = await service.accept(key, Body.parse(req.body));
  res.status(replay ? 200 : 202).json(toJson(row));
});
app.get('/notifications/:id', async (req, res) => {
  const id = /^N-(\d+)$/.exec(req.params.id)?.[1] ?? '0';
  const r = await pool.query('SELECT * FROM notification WHERE id = $1', [id]);
  if (!r.rowCount) throw new AppError(404, 'NOT_FOUND');
  res.json(toJson(r.rows[0]));
});
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function call(method, path, body, key) {
  const r = await fetch(base + path, { method, body: body && JSON.stringify(
    body), headers: { 'content-type': 'application/json',
    ...(key && { 'Idempotency-Key': key }) } });
  console.log(method, path, r.status, JSON.stringify(await r.json()));
}
const otp = { userId: 'U-1', to: '+15550101', channel: 'SMS',
  template: 'otp', params: { code: '4821' } };
await call('POST', '/notifications', otp, 'login-77');
await call('POST', '/notifications', otp, 'login-77');           // replay
await call('POST', '/notifications', { ...otp, channel: 'FAX' }, 'k-2');
await call('POST', '/notifications', { ...otp, params: {} }, 'k-3');
await call('POST', '/notifications', { ...otp, to: 'a@x.io',
  channel: 'EMAIL', template: 'ship', params: { id: 'O-9' } }, 'ship-O-9');
await Promise.all([worker(), worker()]);       // two workers, SKIP LOCKED
console.log('provider calls', JSON.stringify(calls, Object.keys(calls).sort()));
await call('GET', '/notifications/N-1');
await call('GET', '/notifications/N-404');
srv.close(); await pool.end();
