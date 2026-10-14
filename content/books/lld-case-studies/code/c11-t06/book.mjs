import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE TABLE dining_table (id TEXT PRIMARY KEY, capacity INT NOT NULL);
  CREATE TABLE reservation (id SERIAL PRIMARY KEY,
    table_id TEXT NOT NULL REFERENCES dining_table, party_size INT NOT NULL,
    slot TSTZRANGE NOT NULL, status TEXT NOT NULL DEFAULT 'CONFIRMED',
    idempotency_key TEXT NOT NULL UNIQUE,
    EXCLUDE USING gist (table_id WITH =, slot WITH &&)
      WHERE (status IN ('CONFIRMED','SEATED')));
  INSERT INTO dining_table VALUES ('T1',2), ('T2',4), ('T3',4), ('T4',6);`);

// The critical query: best free table that fits, then insert.
// The exclusion constraint is the final judge; a loser retries.
const RETRY = new Set(['23P01', '40P01']);  // overlap lost, deadlock
async function book(key, party, start) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const { rows } = await c.query(`SELECT t.id FROM dining_table t
        WHERE t.capacity >= $1 AND NOT EXISTS (
          SELECT 1 FROM reservation r WHERE r.table_id = t.id
            AND r.status IN ('CONFIRMED','SEATED')
            AND r.slot && tstzrange($2, $2::timestamptz + interval
              '90 minutes'))
        ORDER BY t.capacity, t.id LIMIT 1`, [party, start]);
      if (!rows.length) { await c.query('ROLLBACK'); return 'NO_TABLE'; }
      await c.query(`INSERT INTO reservation (table_id, party_size, slot,
        idempotency_key) VALUES ($1, $2, tstzrange($3, $3::timestamptz
        + interval '90 minutes'), $4)`, [rows[0].id, party, start, key]);
      await c.query('COMMIT');
      return rows[0].id;
    } catch (e) {
      await c.query('ROLLBACK');
      if (!RETRY.has(e.code)) throw e;      // other errors are real
    } finally {
      c.release();
    }
  }
  return 'BUSY_TRY_AGAIN';
}

const T = '2026-03-06 19:00+00';
const got = await Promise.all(['k-a', 'k-b', 'k-c'].map((k) =>
  book(k, 4, T)));
console.log('three parties of 4 got:', JSON.stringify(got.sort()));
console.log('a fourth party of 4 gets:', await book('k-d', 4, T));
console.log('a couple gets:', await book('k-e', 2, T));
const { rows } = await pool.query(`SELECT table_id, count(*)::int AS n
  FROM reservation GROUP BY table_id ORDER BY table_id`);
console.log('per table:', JSON.stringify(rows));
await pool.end();
