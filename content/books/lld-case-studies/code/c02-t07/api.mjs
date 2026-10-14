import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE parking_spot (id TEXT PRIMARY KEY,
    floor_no INT, spot_type TEXT, status TEXT NOT NULL DEFAULT 'FREE');
  CREATE TABLE ticket (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate TEXT, vehicle_type TEXT, spot_id TEXT, entry_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'ACTIVE');
  CREATE UNIQUE INDEX one_visit_per_plate ON ticket (plate)
    WHERE status <> 'EXITED';
  CREATE TABLE payment (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id INT, amount_minor BIGINT, idempotency_key TEXT UNIQUE);
  INSERT INTO parking_spot VALUES ('F1-C1',1,'COMPACT'), ('F1-L1',1,'LARGE');`);
let clock = '2026-01-15T09:00:00Z';         // demo clock: stable output
const FITS = { CAR: ['COMPACT', 'LARGE'], TRUCK: ['LARGE'] };
const RATE = { CAR: 5000, TRUCK: 10000 };   // paise per started hour
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                     // one transaction per call
  const c = await pool.connect(); await c.query('BEGIN');
  try { const out = await fn(c); await c.query('COMMIT'); return out; }
  catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } }
const repo = {                              // SQL only: no HTTP, no rules
  occupyFreeSpot: (c, types) => c.query(`UPDATE parking_spot
    SET status = 'OCCUPIED' WHERE id = (SELECT id FROM parking_spot
      WHERE status = 'FREE' AND spot_type = ANY($1::text[])
      ORDER BY array_position($1::text[], spot_type), floor_no, id
      LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`, [types]),
  insertTicket: (c, ...v) => c.query(`INSERT INTO ticket (plate, vehicle_type,
    spot_id, entry_at) VALUES ($1, $2, $3, $4)
    RETURNING id AS "ticketId", spot_id AS "spotId"`, [...v, clock]),
  markPaid: (c, id) => c.query(`UPDATE ticket SET status = 'PAID'
    WHERE id = $1 AND status = 'ACTIVE' RETURNING *`, [id]),
  paymentByKey: (c, key) => c.query(
    'SELECT * FROM payment WHERE idempotency_key = $1', [key]),
  insertPayment: (c, ...v) => c.query(`INSERT INTO payment (ticket_id,
    amount_minor, idempotency_key) VALUES ($1, $2, $3) RETURNING *`, v),
};
const payJson = (p) => ({ paymentId: p.id, amountMinor: +p.amount_minor });
const service = {                           // rules, one transaction each
  enter: (plate, type) => tx(async (c) => {
    const [spot] = (await repo.occupyFreeSpot(c, FITS[type])).rows;
    if (!spot) throw new AppError(409, 'LOT_FULL');
    return (await repo.insertTicket(c, plate, type, spot.id)).rows[0];
  }),
  pay: (id, key) => tx(async (c) => {
    const [prior] = (await repo.paymentByKey(c, key)).rows;
    if (prior) return { replay: true, payment: payJson(prior) };
    const [t] = (await repo.markPaid(c, id)).rows;   // row stays locked
    if (!t) throw new AppError(409, 'NOT_PAYABLE');  // unknown or not ACTIVE
    const hours = Math.ceil((Date.parse(clock) - t.entry_at) / 3600000);
    const fee = RATE[t.vehicle_type] * Math.max(1, hours);
    const [p] = (await repo.insertPayment(c, id, fee, key)).rows;
    return { replay: false, payment: payJson(p) };
  }),
};
const EntryBody = z.object({ vehicleType: z.enum(Object.keys(FITS)),
  plate: z.string().trim().min(4).max(12).transform((s) => s.toUpperCase()) });
const app = express().use(express.json());
app.post('/entries', async (req, res) => {             // controllers
  const { plate, vehicleType } = EntryBody.parse(req.body);
  res.status(201).json(await service.enter(plate, vehicleType));
});
app.post('/tickets/:id/payments', async (req, res) => {
  const key = z.string().min(1).parse(req.get('Idempotency-Key'));
  const id = z.coerce.number().int().parse(req.params.id);
  const { replay, payment } = await service.pay(id, key);
  res.status(replay ? 200 : 201).json(payment);
});
app.use((err, req, res, next) => {                     // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.constraint === 'one_visit_per_plate' ? [409, 'ALREADY_INSIDE']
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST'] : [500, 'INTERNAL'];
  res.status(status).json({ error }); });
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function post(path, body, key) {
  const r = await fetch(base + path, { method: 'POST', body: JSON.stringify(
    body), headers: { 'content-type': 'application/json',
      ...(key && { 'Idempotency-Key': key }) } });
  console.log(path, r.status, JSON.stringify(await r.json()));
}
for (const [plate, vehicleType] of [['ka01ab1234', 'CAR'], ['KA01AB1234',
  'CAR'], ['TN09TR0001', 'TRUCK'], ['KA05CD5678', 'CAR'], ['KA05', 'BUS']])
  await post('/entries', { plate, vehicleType });
clock = '2026-01-15T11:30:00Z';              // two and a half hours later
for (const key of ['pay-1', 'pay-1', 'pay-2'])
  await post('/tickets/1/payments', {}, key);
srv.close(); await pool.end();
