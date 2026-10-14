import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE TABLE restaurant (id TEXT PRIMARY KEY, dining_minutes INT);
  CREATE TABLE dining_table (id TEXT PRIMARY KEY, restaurant_id TEXT
    REFERENCES restaurant, capacity INT NOT NULL);
  CREATE TABLE reservation (id SERIAL PRIMARY KEY, table_id TEXT NOT NULL,
    customer_id TEXT NOT NULL, party_size INT NOT NULL, slot TSTZRANGE
    NOT NULL, status TEXT NOT NULL DEFAULT 'CONFIRMED',
    idempotency_key TEXT UNIQUE, EXCLUDE USING gist (table_id WITH =,
    slot WITH &&) WHERE (status IN ('CONFIRMED','SEATED')));
  INSERT INTO restaurant VALUES ('RS-1', 90);
  INSERT INTO dining_table VALUES ('T1','RS-1',2), ('T2','RS-1',4);`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                 // one transaction per service call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const COLS = `'RV-' || id AS id, table_id AS "tableId", party_size AS
  "partySize", lower(slot) AS "startsAt", status`;
const repo = {                          // SQL only: no HTTP, no rules
  minutes: (c, r) => c.query(`SELECT dining_minutes AS m FROM restaurant
    WHERE id = $1`, [r]),
  byKey: (c, k) => c.query(`SELECT ${COLS} FROM reservation
    WHERE idempotency_key = $1`, [k]),
  bestFit: (c, r, party, at, m) => c.query(`SELECT t.id FROM dining_table t
    WHERE t.restaurant_id = $1 AND t.capacity >= $2 AND NOT EXISTS (
      SELECT 1 FROM reservation x WHERE x.table_id = t.id AND x.status IN
      ('CONFIRMED','SEATED') AND x.slot && tstzrange($3, $3::timestamptz
      + make_interval(mins => $4))) ORDER BY t.capacity, t.id LIMIT 1`,
    [r, party, at, m]),
  insert: (c, t, b, m, k) => c.query(`INSERT INTO reservation (table_id,
    customer_id, party_size, slot, idempotency_key) VALUES ($1, $2, $3,
    tstzrange($4, $4::timestamptz + make_interval(mins => $5)), $6)
    RETURNING ${COLS}`, [t, b.customerId, b.partySize, b.startsAt, m, k]),
};
const service = {                       // business rules
  book: async (rid, key, body, attempt = 1) => {
    try {
      return await tx(async (c) => {
        const prior = (await repo.byKey(c, key)).rows[0];
        if (prior) return { replay: true, reservation: prior };
        const m = (await repo.minutes(c, rid)).rows[0]?.m;
        if (!m) throw new AppError(404, 'RESTAURANT_NOT_FOUND');
        const t = (await repo.bestFit(c, rid, body.partySize,
          body.startsAt, m)).rows[0];
        if (!t) throw new AppError(409, 'NO_TABLE');
        const [row] = (await repo.insert(c, t.id, body, m, key)).rows;
        return { replay: false, reservation: row };
      });
    } catch (e) {                       // lost the table: choose again
      if (!['23P01', '40P01'].includes(e.code) || attempt === 3) throw e;
      return service.book(rid, key, body, attempt + 1);
    }
  },
};
const Body = z.object({ customerId: z.string().min(1),
  partySize: z.number().int().min(1).max(8), startsAt: z.iso.datetime() });
const app = express().use(express.json());
app.post('/restaurants/:rid/reservations', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { replay, reservation } = await service.book(req.params.rid, key,
    Body.parse(req.body));
  res.status(replay ? 200 : 201).json(reservation);
});
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'DUPLICATE_REQUEST'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function post(rid, body, key) {
  const r = await fetch(`${base}/restaurants/${rid}/reservations`, {
    method: 'POST', body: JSON.stringify(body), headers: {
      'content-type': 'application/json', 'Idempotency-Key': key } });
  console.log(rid, key, r.status, JSON.stringify(await r.json()));
}
const ask = (partySize) => ({ customerId: 'C-1', partySize,
  startsAt: '2026-03-06T19:00:00Z' });
await post('RS-1', ask(3), 'k-1');
await post('RS-1', ask(3), 'k-1');
await post('RS-1', ask(4), 'k-2');
await post('RS-1', ask(0), 'k-3');
await post('RS-9', ask(2), 'k-4'); srv.close(); await pool.end();
