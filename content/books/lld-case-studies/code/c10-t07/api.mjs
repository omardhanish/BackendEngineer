import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE SEQUENCE pnr_seq;
  CREATE TABLE fare_class (flight_id TEXT, code TEXT, price_minor BIGINT
    NOT NULL, seats_left INT NOT NULL CHECK (seats_left >= 0),
    PRIMARY KEY (flight_id, code));
  CREATE TABLE booking (pnr TEXT PRIMARY KEY, flight_id TEXT NOT NULL,
    amount_minor BIGINT NOT NULL, status TEXT NOT NULL,
    hold_until TIMESTAMPTZ NOT NULL, idempotency_key TEXT UNIQUE);
  CREATE TABLE passenger (pnr TEXT REFERENCES booking, pax_no INT,
    full_name TEXT NOT NULL, flight_id TEXT NOT NULL, seat_no TEXT,
    PRIMARY KEY (pnr, pax_no), UNIQUE (flight_id, seat_no));
  INSERT INTO fare_class VALUES ('F1', 'Y-SAVER', 450000, 2);`);
const now = () => '2026-02-10 09:00+00';   // demo clock: stable output
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                     // one transaction per call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const repo = {                              // SQL only: no HTTP, no rules
  byKey: (c, k) => c.query('SELECT * FROM booking WHERE idempotency_key = $1',
    [k]),
  fare: (c, f, code) => c.query(`SELECT price_minor FROM fare_class
    WHERE flight_id = $1 AND code = $2`, [f, code]),
  take: (c, f, code, n) => c.query(`UPDATE fare_class SET seats_left =
    seats_left - $3 WHERE flight_id = $1 AND code = $2
    AND seats_left >= $3`, [f, code, n]),
  insert: (c, f, amount, key) => c.query(`INSERT INTO booking VALUES
    ('PNR-' || nextval('pnr_seq'), $1, $2, 'HELD',
    $3::timestamptz + interval '15 minutes', $4) RETURNING *`,
    [f, amount, now(), key]),
  addPax: (c, pnr, i, name, f) => c.query(`INSERT INTO passenger
    VALUES ($1, $2, $3, $4)`, [pnr, i, name, f]),
  setSeat: (c, pnr, i, seat) => c.query(`UPDATE passenger SET seat_no = $3
    WHERE pnr = $1 AND pax_no = $2`, [pnr, i, seat]),
};
const toJson = (b) => ({ pnr: b.pnr, status: b.status,
  amountMinor: Number(b.amount_minor), holdUntil: b.hold_until });
const service = {                           // business rules
  hold: (key, flight, { fareCode, passengers }) => tx(async (c) => {
    const prior = (await repo.byKey(c, key)).rows[0];
    if (prior) return { replay: true, booking: toJson(prior) };
    const fare = (await repo.fare(c, flight, fareCode)).rows[0];
    if (!fare) throw new AppError(404, 'FARE_NOT_FOUND');
    if (!(await repo.take(c, flight, fareCode, passengers.length)).rowCount)
      throw new AppError(409, 'SOLD_OUT');
    const amount = Number(fare.price_minor) * passengers.length;
    const b = (await repo.insert(c, flight, amount, key)).rows[0];
    for (const [i, p] of passengers.entries())
      await repo.addPax(c, b.pnr, i + 1, p.name, flight);
    return { replay: false, booking: toJson(b) };
  }),
  seat: (pnr, paxNo, seatNo) => tx(async (c) => {
    try {
      const r = await repo.setSeat(c, pnr, paxNo, seatNo);
      if (!r.rowCount) throw new AppError(404, 'PASSENGER_NOT_FOUND');
    } catch (e) {
      throw e.code === '23505' ? new AppError(409, 'SEAT_TAKEN') : e;
    }
    return { pnr, paxNo, seatNo };
  }),
};
const HoldBody = z.object({ fareCode: z.string().min(1),
  passengers: z.array(z.object({ name: z.string().min(1) })).min(1).max(9) });
const app = express().use(express.json());
app.post('/flights/:flightId/bookings', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const body = HoldBody.parse(req.body);
  const out = await service.hold(key, req.params.flightId, body);
  res.status(out.replay ? 200 : 201).json(out.booking);
});
app.put('/bookings/:pnr/passengers/:paxNo/seat', async (req, res) => {
  const { seatNo } = z.object({ seatNo: z.string().regex(/^\d{1,2}[A-K]$/) })
    .parse(req.body);
  const paxNo = z.coerce.number().int().min(1).max(9).parse(req.params.paxNo);
  res.json(await service.seat(req.params.pnr, paxNo, seatNo));
});
app.use((err, req, res, next) => {          // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST']
    : err.type === 'entity.parse.failed' ? [400, 'BAD_JSON']
    : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function call(method, path, body, key) {
  const headers = { 'content-type': 'application/json' };
  if (key) headers['Idempotency-Key'] = key;
  const r = await fetch(base + path, { method, headers,
    body: JSON.stringify(body) });
  console.log(method, path, r.status, JSON.stringify(await r.json()));
}
const two = { fareCode: 'Y-SAVER', passengers: [{ name: 'Asha' },
  { name: 'Ravi' }] };
await call('POST', '/flights/F1/bookings', two, 'k-1');
await call('POST', '/flights/F1/bookings', two, 'k-1');
await call('POST', '/flights/F1/bookings', two, 'k-2');
await call('POST', '/flights/F9/bookings', two, 'k-3');
await call('POST', '/flights/F1/bookings', { fareCode: 'Y-SAVER',
  passengers: [] }, 'k-4');
await call('PUT', '/bookings/PNR-1/passengers/1/seat', { seatNo: '12A' });
await call('PUT', '/bookings/PNR-1/passengers/2/seat', { seatNo: '12A' });
srv.close(); await pool.end();
