import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE TABLE booking (id TEXT PRIMARY KEY, room_id TEXT NOT NULL,
    during TSTZRANGE NOT NULL, status TEXT NOT NULL DEFAULT 'BOOKED',
    version INT NOT NULL DEFAULT 0,
    EXCLUDE USING gist (room_id WITH =, during WITH &&)
      WHERE (status IN ('BOOKED','CHECKED_IN')));`);
async function bookInTx(id, from, to) {      // one client, one transaction
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(`INSERT INTO booking (id, room_id, during)
      VALUES ($1, 'R-1', tstzrange($2, $3, '[)'))`, [id, from, to]);
    await c.query('COMMIT'); return 'ok';
  } catch (e) { await c.query('ROLLBACK'); return e.code; }
  finally { c.release(); }
}
const results = await Promise.all([
  bookInTx('BK-A', '2026-01-15 10:00+00', '2026-01-15 11:00+00'),
  bookInTx('BK-B', '2026-01-15 10:30+00', '2026-01-15 11:30+00')]);
console.log('outcomes:', JSON.stringify(results.sort()));
const { rows } = await pool.query(`SELECT count(*)::int AS n FROM booking
  WHERE room_id = 'R-1'`);
console.log('active bookings in R-1:', rows[0].n);
// Optimistic locking: two editors move the same booking, both read v0.
const [id] = (await pool.query('SELECT id FROM booking')).rows.map((r) => r.id);
const move = (from, to) => pool.query(`UPDATE booking SET version =
  version + 1, during = tstzrange($2, $3, '[)') WHERE id = $1
  AND version = 0`, [id, from, to]);
const moved = await Promise.all([
  move('2026-01-15 14:00+00', '2026-01-15 15:00+00'),
  move('2026-01-15 16:00+00', '2026-01-15 17:00+00')]);
console.log('rows updated:', JSON.stringify(moved.map((r) => r.rowCount)
  .sort()));
const v = await pool.query('SELECT version FROM booking WHERE id = $1', [id]);
console.log('final version:', v.rows[0].version);
await pool.end();
