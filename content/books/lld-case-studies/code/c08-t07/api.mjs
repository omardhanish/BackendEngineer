import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE SEQUENCE hold_seq;
  CREATE TABLE show_seat (show_id TEXT, seat_no TEXT, price_minor BIGINT
    NOT NULL DEFAULT 25000, status TEXT NOT NULL DEFAULT 'AVAILABLE',
    hold_id TEXT, held_until TIMESTAMPTZ, PRIMARY KEY (show_id, seat_no));
  CREATE TABLE booking (id SERIAL PRIMARY KEY, hold_id TEXT UNIQUE,
    idempotency_key TEXT UNIQUE, amount_minor BIGINT NOT NULL);
  INSERT INTO show_seat (show_id, seat_no) VALUES ('SH-1','A1'),
    ('SH-1','A2'), ('SH-1','A3');`);
const now = () => '2026-01-15 18:00+00';   // demo clock: stable output
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                 // one transaction per service call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const repo = {                          // SQL only: no HTTP, no rules
  hasShow: (c, s) => c.query('SELECT 1 FROM show_seat WHERE show_id = $1', [s]),
  lockFree: (c, show, seats) => c.query(`SELECT seat_no FROM show_seat
    WHERE show_id = $1 AND seat_no = ANY($2) AND (status = 'AVAILABLE'
    OR (status = 'HELD' AND held_until <= $3))
    ORDER BY seat_no FOR UPDATE`, [show, seats, now()]),
  markHeld: (c, ...v) => c.query(`UPDATE show_seat SET status = 'HELD',
    hold_id = $3, held_until = $4::timestamptz + interval '10 minutes'
    WHERE show_id = $1 AND seat_no = ANY($2) RETURNING *`, [...v, now()]),
  byKey: (c, key) => c.query(`SELECT id, hold_id, amount_minor FROM booking
    WHERE idempotency_key = $1`, [key]),
  bookHold: (c, holdId) => c.query(`UPDATE show_seat SET status = 'BOOKED'
    WHERE hold_id = $1 AND status = 'HELD' AND held_until > $2
    RETURNING price_minor`, [holdId, now()]),
  insert: (c, ...v) => c.query(`INSERT INTO booking (hold_id,
    idempotency_key, amount_minor) VALUES ($1, $2, $3) RETURNING *`, v),
};
const toJson = (b) => ({ id: `BK-${b.id}`, amountMinor: +b.amount_minor });
const service = {                       // business rules, one transaction
  hold: (show, seats) => tx(async (c) => {
    if (!(await repo.hasShow(c, show)).rowCount)
      throw new AppError(404, 'SHOW_NOT_FOUND');
    if ((await repo.lockFree(c, show, seats)).rowCount !== seats.length)
      throw new AppError(409, 'SEAT_UNAVAILABLE');
    const n = (await c.query("SELECT nextval('hold_seq') AS n")).rows[0].n;
    const [r] = (await repo.markHeld(c, show, seats, `H-${n}`)).rows;
    return { holdId: r.hold_id, seats: seats.sort(), heldUntil: r.held_until };
  }),
  book: (key, holdId) => tx(async (c) => {
    const prior = (await repo.byKey(c, key)).rows[0];
    if (prior) return { replay: true, booking: toJson(prior) };
    const seats = (await repo.bookHold(c, holdId)).rows;
    if (!seats.length) throw new AppError(409, 'HOLD_EXPIRED');
    const amount = seats.reduce((s, r) => s + Number(r.price_minor), 0);
    const row = (await repo.insert(c, holdId, key, amount)).rows[0];
    return { replay: false, booking: toJson(row) };
  }),
};
const HoldBody = z.object({ seats: z.array(z.string()).min(1).max(10)
  .refine((a) => new Set(a).size === a.length, 'duplicate seats') });
const app = express().use(express.json());
app.post('/shows/:showId/holds', async (req, res) => {  // controllers
  const { seats } = HoldBody.parse(req.body);
  res.status(201).json(await service.hold(req.params.showId, seats));
});
app.post('/bookings', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { holdId } = z.object({ holdId: z.string() }).parse(req.body);
  const { replay, booking } = await service.book(key, holdId);
  res.status(replay ? 200 : 201).json(booking);
});
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function post(path, body, headers = {}) {
  const r = await fetch(base + path, { method: 'POST', body: JSON.stringify(
    body), headers: { 'content-type': 'application/json', ...headers } });
  console.log(path, r.status, JSON.stringify(await r.json()));
}
await post('/shows/SH-1/holds', { seats: ['A2', 'A1'] });
await post('/shows/SH-1/holds', { seats: ['A2', 'A3'] });
await post('/shows/SH-1/holds', { seats: ['A3', 'A3'] });
await post('/bookings', { holdId: 'H-1' }, { 'Idempotency-Key': 'k-1' });
await post('/bookings', { holdId: 'H-1' }, { 'Idempotency-Key': 'k-1' });
srv.close(); await pool.end();
