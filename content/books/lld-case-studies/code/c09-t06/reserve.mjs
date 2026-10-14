import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE room_inventory (room_type_id TEXT, night DATE,
    total INT NOT NULL, reserved INT NOT NULL DEFAULT 0,
    rate_minor BIGINT NOT NULL, PRIMARY KEY (room_type_id, night),
    CHECK (reserved BETWEEN 0 AND total));
  CREATE TABLE reservation (id SERIAL PRIMARY KEY, guest_id TEXT,
    room_type_id TEXT, check_in DATE, check_out DATE, status TEXT,
    amount_minor BIGINT, hold_until TIMESTAMPTZ);
  INSERT INTO room_inventory (room_type_id, night, total, rate_minor)
    SELECT 'DLX', d::date, 1, 650000
    FROM generate_series('2026-03-13'::date, '2026-03-16', '1 day') d;`);

// The critical transaction: lock the nights in order, take one unit each.
async function hold(guest, type, checkIn, checkOut, now) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const locked = await c.query(`SELECT night FROM room_inventory
      WHERE room_type_id = $1 AND night >= $2 AND night < $3
      ORDER BY night FOR UPDATE`, [type, checkIn, checkOut]);
    const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 864e5;
    const took = await c.query(`UPDATE room_inventory
      SET reserved = reserved + 1
      WHERE room_type_id = $1 AND night >= $2 AND night < $3
        AND reserved < total RETURNING rate_minor`,
      [type, checkIn, checkOut]);
    if (locked.rowCount !== nights || took.rowCount !== nights) {
      await c.query('ROLLBACK');
      return false;
    }
    const amount = took.rows.reduce((s, r) => s + Number(r.rate_minor), 0);
    await c.query(`INSERT INTO reservation (guest_id, room_type_id,
      check_in, check_out, status, amount_minor, hold_until)
      VALUES ($1, $2, $3, $4, 'HELD', $5,
        $6::timestamptz + interval '15 minutes')`,
      [guest, type, checkIn, checkOut, amount, now]);
    await c.query('COMMIT');
    return true;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

// The sweeper: expire due holds and give back one unit per night each.
async function sweep(now) {
  const r = await pool.query(`
    WITH gone AS (UPDATE reservation SET status = 'EXPIRED'
      WHERE status = 'HELD' AND hold_until <= $1
      RETURNING room_type_id, check_in, check_out),
    per_night AS (SELECT room_type_id, d::date AS night, count(*) AS n
      FROM gone, generate_series(check_in, check_out - 1, '1 day') d
      GROUP BY 1, 2)
    UPDATE room_inventory i SET reserved = reserved - p.n
    FROM per_night p
    WHERE i.room_type_id = p.room_type_id AND i.night = p.night`, [now]);
  return r.rowCount;
}

const T0 = '2026-03-01 09:00+00';
const both = await Promise.all([
  hold('G-7', 'DLX', '2026-03-13', '2026-03-15', T0),
  hold('G-9', 'DLX', '2026-03-14', '2026-03-16', T0),
]);
console.log('holds that succeeded:', both.filter(Boolean).length);
console.log('nights freed at 09:10:', await sweep('2026-03-01 09:10+00'));
console.log('nights freed at 09:15:', await sweep('2026-03-01 09:15+00'));
const T1 = '2026-03-01 09:16+00';
console.log('G-9 retries 14-16:',
  await hold('G-9', 'DLX', '2026-03-14', '2026-03-16', T1));
console.log('G-7 retries 13-15:',
  await hold('G-7', 'DLX', '2026-03-13', '2026-03-15', T1));
const inv = await pool.query(`SELECT night::text, reserved
  FROM room_inventory ORDER BY night`);
console.log(JSON.stringify(inv.rows));
await pool.end();
