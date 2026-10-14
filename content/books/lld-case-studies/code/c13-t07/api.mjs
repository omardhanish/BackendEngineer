import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE court (id TEXT PRIMARY KEY);
  INSERT INTO court VALUES ('C-1'), ('C-2');
  CREATE TABLE booking (id SERIAL PRIMARY KEY, court_id TEXT NOT NULL
    REFERENCES court (id), starts_at TIMESTAMPTZ NOT NULL, hours INT NOT NULL,
    status TEXT NOT NULL, amount_minor BIGINT NOT NULL,
    hold_until TIMESTAMPTZ, idempotency_key TEXT UNIQUE);
  CREATE TABLE booking_slot (booking_id INT REFERENCES booking (id),
    court_id TEXT, slot_start TIMESTAMPTZ, active BOOLEAN DEFAULT true);
  CREATE UNIQUE INDEX one_live_booking_per_hour
    ON booking_slot (court_id, slot_start) WHERE active;`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                     // one transaction per call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const repo = {                              // SQL only, no HTTP, no rules
  byKey: (c, k) => c.query(`SELECT * FROM booking
    WHERE idempotency_key = $1`, [k]),
  insert: (c, v) => c.query(`INSERT INTO booking (court_id, starts_at, hours,
    amount_minor, idempotency_key, status, hold_until) VALUES ($1, $2, $3, $4,
    $5, 'PENDING', $6::timestamptz + interval '10 min') RETURNING *`, v),
  claim: (c, id) => c.query(`INSERT INTO booking_slot SELECT id, court_id,
    starts_at + n * interval '1 hour' FROM booking,
    generate_series(0, hours - 1) AS n WHERE id = $1`, [id]),
  cancel: (c, id) => c.query(`WITH b AS (UPDATE booking SET status =
    'CANCELLED' WHERE id = $1 AND status = 'PENDING' RETURNING *), s AS (
    UPDATE booking_slot SET active = false WHERE booking_id IN (SELECT id
    FROM b)) SELECT * FROM b`, [id]),
};
const isPeak = (d) => d.getUTCDay() % 6 === 0       // weekend, or
  || (d.getUTCHours() >= 17 && d.getUTCHours() < 22); // 17:00-21:59
const toJson = (b) => ({ id: `BK-${b.id}`, status: b.status,
  amountMinor: Number(b.amount_minor) });
const service = {                           // rules, one transaction each
  create: (key, { courtId, startsAt, hours }) => tx(async (c) => {
    const [prior] = (await repo.byKey(c, key)).rows;
    if (prior) return { replay: true, booking: toJson(prior) };
    let amount = 0;                         // PricingStrategy: peak/off-peak
    for (let i = 0; i < hours; i++)
      amount += isPeak(new Date(Date.parse(startsAt) + i * 36e5)) ? 8e4 : 5e4;
    const [b] = (await repo.insert(c, [courtId, startsAt, hours, amount,
      key, '2026-03-06T10:00:00Z'])).rows;   // fixed demo clock
    await repo.claim(c, b.id);              // 23505 here: hour is taken
    return { replay: false, booking: toJson(b) };
  }),
  cancel: (id) => tx(async (c) => {
    const [b] = (await repo.cancel(c, id)).rows;   // row lock until COMMIT
    if (!b) throw new AppError(409, 'NOT_CANCELLABLE');
    return toJson(b);
  }),
};
const Body = z.object({ courtId: z.string().min(1), hours: z.int().min(1)
  .max(3), startsAt: z.iso.datetime().refine((s) => s.endsWith(':00:00Z')) });
const app = express().use(express.json());
app.post('/bookings', async (req, res) => {             // controllers
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { replay, booking } = await service.create(key, Body.parse(req.body));
  res.status(replay ? 200 : 201).json(booking);
});
app.post('/bookings/:id/cancel', async (req, res) => res.json(await service
  .cancel(Number(z.string().regex(/^BK-\d+$/).parse(req.params.id).slice(3)))));
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.constraint === 'one_live_booking_per_hour' ? [409, 'SLOT_TAKEN']
    : err.code === '23503' ? [404, 'COURT_NOT_FOUND']
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
const post = async (path, body = {}, key = '') => { const r = await fetch(
  base + path, { method: 'POST', body: JSON.stringify(body), headers: {
  'content-type': 'application/json', 'idempotency-key': key } });
  console.log(path, r.status, JSON.stringify(await r.json())); };
const at = (h) => `2026-03-06T${h}:00:00Z`;            // a Friday
await post('/bookings', { courtId: 'C-1', hours: 2, startsAt: at(16) }, 'k-1');
await post('/bookings', { courtId: 'C-1', hours: 2, startsAt: at(16) }, 'k-1');
await post('/bookings', { courtId: 'C-1', hours: 1, startsAt: at(17) }, 'k-2');
await post('/bookings', { courtId: 'C-1', hours: 4, startsAt: at(18) }, 'k-3');
await post('/bookings', { courtId: 'C-9', hours: 1, startsAt: at(18) }, 'k-4');
await post('/bookings/BK-1/cancel');
await post('/bookings', { courtId: 'C-1', hours: 1, startsAt: at(17) }, 'k-2');
srv.close(); await pool.end();
