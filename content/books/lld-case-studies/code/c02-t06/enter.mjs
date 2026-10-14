import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE parking_spot (id TEXT PRIMARY KEY,
    floor_no INT NOT NULL, spot_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'FREE');
  CREATE TABLE ticket (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate TEXT NOT NULL, spot_id TEXT NOT NULL REFERENCES parking_spot,
    status TEXT NOT NULL DEFAULT 'ACTIVE', exit_at TIMESTAMPTZ);
  CREATE UNIQUE INDEX one_car_per_spot ON ticket (spot_id)
    WHERE status <> 'EXITED';
  INSERT INTO parking_spot VALUES ('F1-C1', 1, 'COMPACT', 'FREE'),
    ('F2-C1', 2, 'COMPACT', 'FREE'), ('F1-L1', 1, 'LARGE', 'OCCUPIED');`);
const FITS = { CAR: ['COMPACT', 'LARGE'], TRUCK: ['LARGE'] };

async function tx(fn) {                  // one transaction per call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const enter = (plate, type) => tx(async (c) => {
  const { rows } = await c.query(`SELECT id FROM parking_spot
    WHERE status = 'FREE' AND spot_type = ANY($1::text[])
    ORDER BY array_position($1::text[], spot_type), floor_no, id
    LIMIT 1 FOR UPDATE SKIP LOCKED`, [FITS[type]]);
  if (!rows.length) return 'LOT_FULL';
  const spot = rows[0].id;
  await c.query(`UPDATE parking_spot SET status = 'OCCUPIED'
    WHERE id = $1`, [spot]);
  await c.query('INSERT INTO ticket (plate, spot_id) VALUES ($1, $2)',
    [plate, spot]);
  return spot;
});
const exit = (spot, at) => tx(async (c) => {
  const { rowCount } = await c.query(`UPDATE ticket SET status = 'EXITED',
    exit_at = $2 WHERE spot_id = $1 AND status = 'PAID'`, [spot, at]);
  if (!rowCount) return 'NOT_PAID';
  await c.query(`UPDATE parking_spot SET status = 'FREE'
    WHERE id = $1`, [spot]);
  return 'EXITED';
});

const results = await Promise.all([enter('KA01AB1234', 'CAR'),
  enter('KA05CD5678', 'CAR'), enter('KA03EF9012', 'CAR')]);
console.log('three gates at once:', JSON.stringify(results.sort()));
console.log('truck:', await enter('TN09TR0001', 'TRUCK'));
console.log('unpaid exit F1-C1:', await exit('F1-C1', '2026-01-15 11:00Z'));
await pool.query(`UPDATE ticket SET status = 'PAID'
  WHERE spot_id = 'F1-C1' AND status = 'ACTIVE'`);
console.log('paid exit F1-C1:', await exit('F1-C1', '2026-01-15 11:05Z'));
console.log('next car:', await enter('KA09GH3456', 'CAR'));
const { rows } = await pool.query(`SELECT status, count(*)::int AS n
  FROM parking_spot GROUP BY status ORDER BY status`);
console.log(JSON.stringify(rows));
await pool.end();
