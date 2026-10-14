import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE room_inventory (room_type_id TEXT,
    night DATE, total INT, reserved INT NOT NULL DEFAULT 0,
    rate_minor BIGINT, PRIMARY KEY (room_type_id, night));
  CREATE TABLE reservation (id SERIAL PRIMARY KEY, room_type_id TEXT,
    check_in DATE, check_out DATE, status TEXT, amount_minor BIGINT,
    idempotency_key TEXT UNIQUE);
  INSERT INTO room_inventory SELECT 'DLX', d::date, 1, 0, 650000
    FROM generate_series('2026-03-13'::date, '2026-03-15', '1 day') d;`);
const TODAY = '2026-03-01';                   // demo clock: stable output
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                 // one transaction per service call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const NIGHTS = 'room_type_id = $1 AND night >= $2 AND night < $3';
const repo = {                          // SQL only: no HTTP, no rules
  lock: (c, ...v) => c.query(`SELECT night FROM room_inventory
    WHERE ${NIGHTS} ORDER BY night FOR UPDATE`, v),
  shift: (c, ...v) => c.query(`UPDATE room_inventory SET reserved =
    reserved + $4 WHERE ${NIGHTS} AND reserved + $4 BETWEEN 0 AND total
    RETURNING rate_minor`, v),
  byKey: (c, k) => c.query(`SELECT * FROM reservation
    WHERE idempotency_key = $1`, [k]),
  insert: (c, ...v) => c.query(`INSERT INTO reservation (room_type_id,
    check_in, check_out, status, amount_minor, idempotency_key)
    VALUES ($1, $2, $3, 'HELD', $4, $5) RETURNING *`, v),
  byId: (c, id) => c.query(`SELECT *, check_in::text AS ci,
    check_out::text AS co FROM reservation WHERE id = $1 FOR UPDATE`, [id]),
  setStatus: (c, id, s) => c.query(`UPDATE reservation SET status = $2
    WHERE id = $1 RETURNING *`, [id, s]),
};
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
const toJson = (r) => ({ id: `RS-${r.id}`, roomType: r.room_type_id,
  status: r.status, amountMinor: Number(r.amount_minor) });
const service = {                       // business rules, one transaction
  hold: (key, { roomType: t, checkIn: a, checkOut: b }) => tx(async (c) => {
    const prior = (await repo.byKey(c, key)).rows[0];
    if (prior) return { replay: true, r: prior };
    await repo.lock(c, t, a, b);             // nights in date order
    const took = (await repo.shift(c, t, a, b, 1)).rows;
    if (took.length !== days(a, b)) throw new AppError(409, 'SOLD_OUT');
    const amount = took.reduce((s, x) => s + Number(x.rate_minor), 0);
    return { replay: false,
      r: (await repo.insert(c, t, a, b, amount, key)).rows[0] };
  }),
  cancel: (id) => tx(async (c) => {
    const r = (await repo.byId(c, id)).rows[0];
    if (!r) throw new AppError(404, 'RESERVATION_NOT_FOUND');
    if (!['HELD', 'CONFIRMED'].includes(r.status))
      throw new AppError(409, 'NOT_CANCELLABLE');
    await repo.lock(c, r.room_type_id, r.ci, r.co);  // same order as hold
    await repo.shift(c, r.room_type_id, r.ci, r.co, -1);
    const paid = r.status === 'CONFIRMED';         // a hold was never charged
    const refund = paid && days(TODAY, r.ci) >= 2 ? Number(r.amount_minor) : 0;
    const [done] = (await repo.setStatus(c, id, 'CANCELLED')).rows;
    return { ...toJson(done), refundMinor: refund }; // FreeUntilDaysBefore
  }),
};
const HoldBody = z.object({ roomType: z.string(), checkIn: z.iso.date(),
  checkOut: z.iso.date(), guests: z.number().int().min(1).max(4) })
  .refine((s) => s.checkOut > s.checkIn, 'checkOut must follow checkIn');
const app = express().use(express.json());
app.post('/reservations', async (req, res) => {        // controllers
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { replay, r } = await service.hold(key, HoldBody.parse(req.body));
  res.status(replay ? 200 : 201).json(toJson(r));
});
app.post('/reservations/:id/cancel', async (req, res) => {
  const id = z.string().regex(/^RS-\d+$/).parse(req.params.id);
  res.json(await service.cancel(Number(id.slice(3))));
});
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function post(path, body = {}, key) {
  const r = await fetch(base + path, { method: 'POST', body: JSON.stringify(
    body), headers: { 'content-type': 'application/json',
    ...(key && { 'Idempotency-Key': key }) } });
  console.log(path, r.status, JSON.stringify(await r.json()));
}
const stay = { roomType: 'DLX', checkIn: '2026-03-13',
  checkOut: '2026-03-15', guests: 2 };
await post('/reservations', stay, 'k-1');
await post('/reservations', stay, 'k-1');                   // replay
await post('/reservations', stay, 'k-2');                   // sold out
await post('/reservations', { ...stay, checkOut: '2026-03-12' }, 'k-3');
await post('/reservations/RS-1/cancel');
await post('/reservations/RS-1/cancel');
await post('/reservations/RS-9/cancel');
srv.close(); await pool.end();
