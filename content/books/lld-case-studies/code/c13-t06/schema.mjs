import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE ground (id TEXT PRIMARY KEY, name TEXT NOT NULL,
    time_zone TEXT NOT NULL);
  CREATE TABLE court (id TEXT PRIMARY KEY,
    ground_id TEXT NOT NULL REFERENCES ground (id),
    sport TEXT NOT NULL CONSTRAINT known_sport
      CHECK (sport IN ('FOOTBALL', 'BADMINTON', 'TENNIS', 'CRICKET')),
    outdoor BOOLEAN NOT NULL);
  CREATE TABLE booking (id TEXT PRIMARY KEY,
    court_id TEXT NOT NULL REFERENCES court (id),
    player_id TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    status TEXT NOT NULL CHECK (status IN
      ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED')),
    hold_until TIMESTAMPTZ, idempotency_key TEXT UNIQUE,
    CONSTRAINT ends_after_start CHECK (ends_at > starts_at),
    CONSTRAINT pending_has_deadline
      CHECK (status <> 'PENDING' OR hold_until IS NOT NULL));
  CREATE INDEX booking_by_player ON booking (player_id, starts_at);
  CREATE INDEX pending_by_deadline ON booking (hold_until)
    WHERE status = 'PENDING';
  CREATE TABLE booking_slot (
    booking_id TEXT NOT NULL REFERENCES booking (id),
    court_id TEXT NOT NULL REFERENCES court (id),
    slot_start TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (booking_id, slot_start));
  CREATE UNIQUE INDEX one_live_booking_per_hour
    ON booking_slot (court_id, slot_start) WHERE active;

  INSERT INTO ground VALUES ('G-1', 'Riverside Arena', 'Europe/London');
  INSERT INTO court VALUES ('C-1', 'G-1', 'FOOTBALL', true),
    ('C-2', 'G-1', 'BADMINTON', false);
  INSERT INTO booking (id, court_id, player_id, starts_at, ends_at,
    amount_minor, status) VALUES ('BK-1', 'C-1', 'P-1',
    '2026-03-06 18:00+00', '2026-03-06 20:00+00', 160000, 'CONFIRMED');
  INSERT INTO booking_slot (booking_id, court_id, slot_start) VALUES
    ('BK-1', 'C-1', '2026-03-06 18:00+00'),
    ('BK-1', 'C-1', '2026-03-06 19:00+00');`);

const B = `INSERT INTO booking (id, court_id, player_id, starts_at,
  ends_at, amount_minor, status, hold_until) VALUES `;
async function attempt(label, sql) {
  try { await pool.query(sql); console.log(`${label}: ok`); }
  catch (e) { console.log(`${label}: ${e.code} ${e.constraint}`); }
}
await attempt('BK-2 row', B + `('BK-2', 'C-1', 'P-2', '2026-03-06 19:00+00',
  '2026-03-06 20:00+00', 80000, 'PENDING', '2026-03-06 10:10+00')`);
await attempt('BK-2 takes 19:00', `INSERT INTO booking_slot VALUES
  ('BK-2', 'C-1', '2026-03-06 19:00+00')`);
await attempt('end before start', B + `('BK-3', 'C-2', 'P-2',
  '2026-03-06 19:00+00', '2026-03-06 18:00+00', 0, 'CONFIRMED', NULL)`);
await attempt('pending, no deadline', B + `('BK-4', 'C-2', 'P-2',
  '2026-03-06 07:00+00', '2026-03-06 08:00+00', 0, 'PENDING', NULL)`);
await attempt('unknown court', B + `('BK-5', 'C-9', 'P-2',
  '2026-03-06 07:00+00', '2026-03-06 08:00+00', 0, 'CONFIRMED', NULL)`);
await attempt('chess court', `INSERT INTO court VALUES
  ('C-3', 'G-1', 'CHESS', false)`);

await pool.query(`UPDATE booking SET status = 'CANCELLED' WHERE id = 'BK-1';
  UPDATE booking_slot SET active = false WHERE booking_id = 'BK-1'`);
await attempt('after cancel, BK-2 takes 19:00', `INSERT INTO booking_slot
  VALUES ('BK-2', 'C-1', '2026-03-06 19:00+00')`);

// The grid query: every hour of the evening, free or owned.
const grid = await pool.query(`
  SELECT to_char(h AT TIME ZONE 'Europe/London', 'HH24:MI') AS hour,
    s.booking_id
  FROM generate_series('2026-03-06 17:00+00'::timestamptz,
    '2026-03-06 20:00+00', interval '1 hour') AS h
  LEFT JOIN booking_slot s
    ON s.court_id = 'C-1' AND s.slot_start = h AND s.active
  ORDER BY h`);
for (const r of grid.rows) console.log(r.hour, r.booking_id ?? 'free');
await pool.end();
