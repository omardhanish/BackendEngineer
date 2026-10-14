import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE fare_class (flight_id TEXT, code TEXT, seats_left INT
    NOT NULL CHECK (seats_left >= 0), PRIMARY KEY (flight_id, code));
  CREATE TABLE booking (pnr TEXT PRIMARY KEY, flight_id TEXT, fare_code TEXT,
    pax_count INT NOT NULL, status TEXT NOT NULL,
    hold_until TIMESTAMPTZ NOT NULL);
  INSERT INTO fare_class VALUES ('F1', 'Y-SAVER', 1), ('F1', 'J-FLEX', 4);`);

// The critical query: subtract only if enough seats remain, in one UPDATE.
async function holdFare(pnr, fare, pax, now) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await c.query(`UPDATE fare_class
      SET seats_left = seats_left - $2
      WHERE flight_id = 'F1' AND code = $1 AND seats_left >= $2
      RETURNING seats_left`, [fare, pax]);
    if (r.rowCount === 0) { await c.query('ROLLBACK'); return false; }
    await c.query(`INSERT INTO booking VALUES ($1, 'F1', $2, $3, 'HELD',
      $4::timestamptz + interval '15 minutes')`, [pnr, fare, pax, now]);
    await c.query('COMMIT');
    return true;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

// The sweeper: expire old holds and give their seats back, in one statement.
async function expireHolds(now) {
  const r = await pool.query(`WITH expired AS (
      UPDATE booking SET status = 'EXPIRED'
      WHERE status = 'HELD' AND hold_until <= $1
      RETURNING fare_code, pax_count),
    freed AS (SELECT fare_code, sum(pax_count)::int AS n
      FROM expired GROUP BY fare_code)
    UPDATE fare_class f SET seats_left = f.seats_left + freed.n
    FROM freed WHERE f.flight_id = 'F1' AND f.code = freed.fare_code
    RETURNING f.code, freed.n`, [now]);
  return r.rows.map((x) => `${x.code} +${x.n}`).sort().join(', ') || 'none';
}

const left = async () => (await pool.query(`SELECT code, seats_left
  FROM fare_class ORDER BY code`)).rows.map((r) => `${r.code}=${r.seats_left}`);

const T0 = '2026-02-10 09:00+00';
const race = await Promise.all([
  holdFare('PNR-7', 'Y-SAVER', 1, T0),
  holdFare('PNR-9', 'Y-SAVER', 1, T0),
]);
console.log('last Y-SAVER seat, holds that won:', race.filter(Boolean).length);
console.log('3 pax on J-FLEX:', await holdFare('PNR-10', 'J-FLEX', 3, T0));
console.log('2 pax on J-FLEX:', await holdFare('PNR-11', 'J-FLEX', 2, T0));
console.log('seats left:', (await left()).join(' '));
console.log('sweep at 09:10:', await expireHolds('2026-02-10 09:10+00'));
console.log('sweep at 09:16:', await expireHolds('2026-02-10 09:16+00'));
console.log('seats left:', (await left()).join(' '));
const st = await pool.query(`SELECT status, count(*)::int AS n FROM booking
  GROUP BY status ORDER BY status`);
console.log(JSON.stringify(st.rows));
await pool.end();
