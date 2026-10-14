import express from 'express'; import pg from 'pg'; import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE TABLE room (id TEXT PRIMARY KEY, capacity INT NOT NULL);
  CREATE TABLE booking (id SERIAL PRIMARY KEY, room_id TEXT NOT NULL
    REFERENCES room(id), organizer_id TEXT NOT NULL, attendees INT NOT NULL,
    during TSTZRANGE NOT NULL, status TEXT NOT NULL DEFAULT 'BOOKED',
    idempotency_key TEXT, UNIQUE (organizer_id, idempotency_key),
    EXCLUDE USING gist (room_id WITH =, during WITH &&)
      WHERE (status IN ('BOOKED','CHECKED_IN')));
  INSERT INTO room VALUES ('R-1', 4), ('R-2', 10);`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                 // one transaction per service call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const repo = {                          // SQL only: no HTTP, no rules
  room: (c, id) => c.query('SELECT * FROM room WHERE id = $1', [id]),
  lock: (c, i) => c.query('SELECT * FROM booking WHERE id=$1 FOR UPDATE', [i]),
  byKey: (c, org, k) => c.query(`SELECT * FROM booking
    WHERE organizer_id = $1 AND idempotency_key = $2`, [org, k]),
  insert: (c, b, k) => c.query(`INSERT INTO booking (room_id, organizer_id,
    attendees, during, idempotency_key) VALUES ($1, $2, $3,
    tstzrange($4, $5, '[)'), $6) RETURNING *`,
    [b.roomId, b.organizerId, b.attendees, b.start, b.end, k]),
  cancel: (c, id) => c.query(`UPDATE booking SET status = 'CANCELLED'
    WHERE id = $1 RETURNING *`, [id]),
  free: (q) => pool.query(`SELECT r.id FROM room r WHERE r.capacity >= $3
    AND NOT EXISTS (SELECT 1 FROM booking b WHERE b.room_id = r.id AND
    b.status IN ('BOOKED','CHECKED_IN') AND b.during && tstzrange($1, $2, '[)'))
    ORDER BY r.capacity, r.id`, [q.start, q.end, q.attendees]),
};
const toJson = (b) => ({ id: `BK-${b.id}`, room: b.room_id, status: b.status });
const service = {                       // business rules, one transaction
  book: (body, key) => tx(async (c) => {
    const prior = (await repo.byKey(c, body.organizerId, key)).rows[0];
    if (prior) return { replay: true, booking: toJson(prior) };
    const room = (await repo.room(c, body.roomId)).rows[0];
    if (!room) throw new AppError(404, 'ROOM_NOT_FOUND');
    if (body.attendees > room.capacity) throw new AppError(422, 'TOO_MANY');
    const row = (await repo.insert(c, body, key)).rows[0];
    return { replay: false, booking: toJson(row) };
  }),
  cancel: (id) => tx(async (c) => {     // lock the row, then decide
    const b = (await repo.lock(c, id)).rows[0];
    if (!b) throw new AppError(404, 'BOOKING_NOT_FOUND');
    if (b.status !== 'BOOKED') throw new AppError(409, 'NOT_CANCELLABLE');
    return toJson((await repo.cancel(c, id)).rows[0]);
  }),
};
const iso = z.iso.datetime({ offset: true }), Slot = { start: iso, end: iso };
const later = [(b) => Date.parse(b.end) > Date.parse(b.start), 'end <= start'];
const BookBody = z.object({ roomId: z.string(), organizerId: z.string(),
  attendees: z.number().int().positive(), ...Slot }).refine(...later);
const FreeQuery = z.object({ attendees: z.coerce.number().int().positive(),
  ...Slot }).refine(...later);
const app = express().use(express.json());
app.get('/rooms/available', async (req, res) =>        // controllers
  res.json((await repo.free(FreeQuery.parse(req.query))).rows.map(r => r.id)));
app.post('/bookings', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { replay, booking } = await service.book(BookBody.parse(req.body), key);
  res.status(replay ? 200 : 201).json(booking);
});
app.post('/bookings/:id/cancel', async (req, res) => {
  const id = Number(req.params.id.replace('BK-', ''));
  if (!Number.isInteger(id)) throw new AppError(404, 'BOOKING_NOT_FOUND');
  res.json(await service.cancel(id));
});
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23P01' ? [409, 'ROOM_TAKEN']
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function call(method, path, body, key) {
  const r = await fetch(base + path, { method, body: JSON.stringify(body),
    headers: { 'content-type': 'application/json',
    ...(key && { 'Idempotency-Key': key }) } });
  console.log(method, path, r.status, JSON.stringify(await r.json()));
}
const t = (hm) => `2026-01-15T${hm}:00Z`, req = (roomId, s, e) =>
  ({ roomId, organizerId: 'E-1', attendees: 3, start: t(s), end: t(e) });
await call('POST', '/bookings', req('R-1', '10:00', '11:00'), 'k-1');
await call('POST', '/bookings', req('R-1', '10:00', '11:00'), 'k-1');
await call('POST', '/bookings', req('R-1', '10:30', '11:30'), 'k-2');
await call('POST', '/bookings', req('R-1', '12:00', '11:00'), 'k-3');
await call('POST', '/bookings', req('R-9', '10:00', '11:00'), 'k-4');
await call('GET', `/rooms/available?attendees=3&start=${t('10:30')}` +
  `&end=${t('11:30')}`);
for (const n of [1, 1, 99]) await call('POST', `/bookings/BK-${n}/cancel`);
srv.close(); await pool.end();
