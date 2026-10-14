import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE show_seat (show_id TEXT, seat_no TEXT,
    status TEXT NOT NULL DEFAULT 'AVAILABLE'
      CHECK (status IN ('AVAILABLE','HELD','BOOKED')),
    hold_id TEXT, held_until TIMESTAMPTZ, PRIMARY KEY (show_id, seat_no));
  INSERT INTO show_seat (show_id, seat_no) VALUES
    ('SH-1','A1'), ('SH-1','A2'), ('SH-1','A3'), ('SH-1','A4');`);

// The critical query: lock rows in a fixed order, check, then write.
async function holdSeats(seats, holdId, now) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(`SELECT seat_no FROM show_seat
      WHERE show_id = 'SH-1' AND seat_no = ANY($1)
        AND (status = 'AVAILABLE'
          OR (status = 'HELD' AND held_until <= $2))
      ORDER BY seat_no FOR UPDATE`, [seats, now]);
    if (rows.length !== seats.length) {
      await c.query('ROLLBACK');
      return false;
    }
    await c.query(`UPDATE show_seat SET status = 'HELD', hold_id = $2,
      held_until = $3::timestamptz + interval '10 minutes'
      WHERE show_id = 'SH-1' AND seat_no = ANY($1)`, [seats, holdId, now]);
    await c.query('COMMIT');
    return true;
  } finally {
    c.release();
  }
}

async function confirm(holdId, now) {
  const r = await pool.query(`UPDATE show_seat SET status = 'BOOKED'
    WHERE hold_id = $1 AND status = 'HELD' AND held_until > $2`,
    [holdId, now]);
  return r.rowCount;
}

const T0 = '2026-01-15 18:00+00';
const results = await Promise.all([
  holdSeats(['A1', 'A2'], 'H-A', T0),
  holdSeats(['A2', 'A3'], 'H-B', T0),
]);
console.log('holds that succeeded:', results.filter(Boolean).length);
const winner = results[0] ? 'H-A' : 'H-B';
console.log('seats booked for winner:', await confirm(winner, T0));

console.log('U-3 holds A4 at 18:00:',
  await holdSeats(['A4'], 'H-C', T0));
console.log('U-4 holds A4 at 18:05:',
  await holdSeats(['A4'], 'H-D', '2026-01-15 18:05+00'));
console.log('U-4 holds A4 at 18:11:',
  await holdSeats(['A4'], 'H-D', '2026-01-15 18:11+00'));
console.log('U-3 confirms at 18:12, rows:',
  await confirm('H-C', '2026-01-15 18:12+00'));

const end = await pool.query(`SELECT status, count(*)::int AS n
  FROM show_seat GROUP BY status ORDER BY status`);
console.log(JSON.stringify(end.rows));
await pool.end();
