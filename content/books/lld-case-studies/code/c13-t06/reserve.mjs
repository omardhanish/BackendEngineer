import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE booking (id TEXT PRIMARY KEY, court_id TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL, hold_until TIMESTAMPTZ);
  CREATE TABLE booking_slot (booking_id TEXT REFERENCES booking (id),
    court_id TEXT NOT NULL, slot_start TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (booking_id, slot_start));
  CREATE UNIQUE INDEX one_live_booking_per_hour
    ON booking_slot (court_id, slot_start) WHERE active;`);

// The critical transaction: expire stale holds, then claim every hour.
async function reserve(id, court, start, hours, now) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(`WITH gone AS (
        UPDATE booking SET status = 'EXPIRED'
        WHERE court_id = $1 AND status = 'PENDING' AND hold_until <= $2
        RETURNING id)
      UPDATE booking_slot SET active = false
      WHERE booking_id IN (SELECT id FROM gone)`, [court, now]);
    await c.query(`INSERT INTO booking VALUES ($1, $2, $3,
      $3::timestamptz + $4 * interval '1 hour', 'PENDING',
      $5::timestamptz + interval '10 minutes')`,
      [id, court, start, hours, now]);
    await c.query(`INSERT INTO booking_slot (booking_id, court_id,
      slot_start) SELECT $1, $2, h FROM generate_series($3::timestamptz,
      $3::timestamptz + ($4 - 1) * interval '1 hour', interval '1 hour')
      AS h`, [id, court, start, hours]);
    await c.query('COMMIT');
    return 'ok';
  } catch (e) {
    await c.query('ROLLBACK');
    if (e.code === '23505') return `SLOT_TAKEN (${e.code})`;
    throw e;
  } finally {
    c.release();
  }
}

async function confirm(id, now) {
  const r = await pool.query(`UPDATE booking SET status = 'CONFIRMED'
    WHERE id = $1 AND status = 'PENDING' AND hold_until > $2`, [id, now]);
  return r.rowCount;
}

const SAT = (h) => `2026-03-07 ${h}+00`;
const NOW = (m) => `2026-03-06 10:${m}+00`;
const race = await Promise.all([
  reserve('BK-A', 'C-1', SAT('18:00'), 2, NOW('00')),
  reserve('BK-B', 'C-1', SAT('19:00'), 2, NOW('00')),
]);
console.log('race winners:', race.filter((r) => r === 'ok').length,
  '| loser got:', race.find((r) => r !== 'ok'));
const paid = (await confirm('BK-A', NOW('00')))
  + (await confirm('BK-B', NOW('00')));
console.log('10:00 winner pays, rows confirmed:', paid);

console.log('10:00 BK-C holds 07:00:',
  await reserve('BK-C', 'C-1', SAT('07:00'), 1, NOW('00')));
console.log('10:05 BK-D holds 07:00:',
  await reserve('BK-D', 'C-1', SAT('07:00'), 1, NOW('05')));
console.log('10:11 BK-D holds 07:00:',
  await reserve('BK-D', 'C-1', SAT('07:00'), 1, NOW('11')));
console.log('10:12 BK-C confirms, rows:', await confirm('BK-C', NOW('12')));

const end = await pool.query(`SELECT status, count(*)::int AS n
  FROM booking GROUP BY status ORDER BY status`);
console.log(JSON.stringify(end.rows));
const live = await pool.query(`SELECT count(*)::int AS n
  FROM booking_slot WHERE active`);
console.log('live court hours:', live.rows[0].n);
await pool.end();
