import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE rate_counter (
  limit_key TEXT NOT NULL, window_start TIMESTAMPTZ NOT NULL,
  hits INT NOT NULL CHECK (hits > 0),
  PRIMARY KEY (limit_key, window_start))`);

// One atomic statement: insert the first hit, or add one only below the limit.
// A full window returns no row, which means "reject".
async function tryAcquire(key, windowStart, limit) {
  const { rowCount } = await pool.query(`
    INSERT INTO rate_counter (limit_key, window_start, hits)
    VALUES ($1, $2, 1)
    ON CONFLICT (limit_key, window_start) DO UPDATE
      SET hits = rate_counter.hits + 1
      WHERE rate_counter.hits < $3
    RETURNING hits`, [key, windowStart, limit]);
  return rowCount === 1;
}

// Ten requests from several app instances arrive at once; the limit is 5.
const w1 = '2026-01-15 10:00:00+00';
const results = await Promise.all(Array.from({ length: 10 },
  () => tryAcquire('key-A', w1, 5)));
console.log('window 1 allowed:', results.filter(Boolean).length,
  'rejected:', results.filter((ok) => !ok).length);
const w2 = '2026-01-15 10:01:00+00';
console.log('window 2 first call allowed:', await tryAcquire('key-A', w2, 5));
const { rows } = await pool.query(`SELECT to_char(window_start AT TIME ZONE
  'UTC', 'HH24:MI') AS w, hits FROM rate_counter ORDER BY window_start`);
console.log('stored:', JSON.stringify(rows));
await pool.end();
