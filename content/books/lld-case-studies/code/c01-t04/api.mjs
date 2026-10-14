import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE slot (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL);
  CREATE TABLE appointment (id SERIAL PRIMARY KEY,
    slot_id TEXT NOT NULL UNIQUE, patient_id TEXT NOT NULL);
  CREATE TABLE idempotency_key (key TEXT PRIMARY KEY,
    request JSONB NOT NULL, body JSONB);
  INSERT INTO slot SELECT 'SL-' || n, 'D-1', timestamptz
    '2026-03-02 09:00+00' + (n - 1) * interval '30 minutes'
    FROM generate_series(1, 5) AS n;`);
class ApiError extends Error { constructor(s, c) { super(c); this.status = s } }
async function tx(fn) {                 // one transaction per service call
  const c = await pool.connect(); await c.query('BEGIN');
  try { const out = await fn(c); await c.query('COMMIT'); return out; }
  catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const encode = (row) => Buffer.from(JSON.stringify(
  { t: row.starts_at.toISOString(), id: row.id })).toString('base64url');
const decode = (s) => { try { return JSON.parse(Buffer.from(s, 'base64url')
  .toString()); } catch { throw new ApiError(400, 'BAD_CURSOR'); } };
async function listSlots(doctorId, limit, after) {   // keyset pagination
  const cur = after ? decode(after) : { t: null, id: null };
  const { rows } = await pool.query(`SELECT id, starts_at FROM slot
    WHERE doctor_id = $1 AND ($2::timestamptz IS NULL
      OR (starts_at, id) > ($2::timestamptz, $3::text))
    ORDER BY starts_at, id LIMIT $4`, [doctorId, cur.t, cur.id, limit + 1]);
  const next = rows.length > limit ? encode(rows[limit - 1]) : null;
  return { items: rows.slice(0, limit).map((r) => r.id), nextCursor: next };
}
const book = (key, input) => tx(async (c) => {
  const claim = await c.query(`INSERT INTO idempotency_key (key, request)
    VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [key, input]);
  if (claim.rowCount === 0) {                     // key seen before
    const { rows: [old] } = await c.query(`SELECT request = $2::jsonb
      AS same, body FROM idempotency_key WHERE key = $1`, [key, input]);
    if (!old.same) throw new ApiError(422, 'KEY_REUSED');
    return { status: 200, body: old.body };       // replay, no new row
  }
  if (!(await c.query('SELECT FROM slot WHERE id = $1', [input.slotId]))
    .rowCount) throw new ApiError(404, 'SLOT_NOT_FOUND');
  const { rows: [a] } = await c.query(`INSERT INTO appointment (slot_id,
    patient_id) VALUES ($1, $2) RETURNING *`, [input.slotId, input.patientId]);
  const body = { id: `AP-${a.id}`, slotId: a.slot_id };
  await c.query('UPDATE idempotency_key SET body = $2 WHERE key = $1',
    [key, body]);
  return { status: 201, body };
});
const app = express().use(express.json());
app.get('/doctors/:id/slots', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  res.json(await listSlots(req.params.id, limit, req.query.after));
});
const NewAppointment = z.object({ slotId: z.string(), patientId: z.string() });
app.post('/appointments', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { status, body } = await book(key, NewAppointment.parse(req.body));
  res.status(status).json(body);
});
app.use((err, req, res, next) => {                // one error shape
  const fail = (s, code, x) => res.status(s).json({ error: { code, ...x } });
  if (err instanceof z.ZodError) return fail(400, 'VALIDATION',
    { fields: err.issues.map((i) => i.path.join('.')) });
  if (err.code === '23505') return fail(409, 'SLOT_TAKEN');
  if (err instanceof ApiError) return fail(err.status, err.message);
  fail(500, 'INTERNAL');
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function call(method, path, body, key = '') {   // print each reply
  const r = await fetch(base + path, { method, body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'Idempotency-Key': key } });
  const json = await r.json(), shown = JSON.stringify(json).replace(
    /"nextCursor":"[^"]+"/, '"nextCursor":"…"');
  console.log(method, path.split('&')[0], key, r.status, shown);
  return json;
}
const p1 = await call('GET', '/doctors/D-1/slots?limit=2');
await call('GET', `/doctors/D-1/slots?limit=2&after=${p1.nextCursor}`);
const visit = { slotId: 'SL-1', patientId: 'P-1' };
await call('POST', '/appointments', visit, 'k-1');
await call('POST', '/appointments', visit, 'k-1');
await call('POST', '/appointments', { ...visit, slotId: 'SL-2' }, 'k-1');
await call('POST', '/appointments', { ...visit, patientId: 'P-2' }, 'k-2');
await call('POST', '/appointments', { slotId: 'SL-9' }, 'k-3');
await call('POST', '/appointments', { ...visit, slotId: 'SL-9' }, 'k-4');
srv.close(); await pool.end();
