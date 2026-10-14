import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE EXTENSION btree_gist;   -- lets GiST compare plain TEXT with =
  CREATE TABLE hotel (id TEXT PRIMARY KEY, name TEXT NOT NULL,
    time_zone TEXT NOT NULL);
  CREATE TABLE room_type (id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL REFERENCES hotel(id), code TEXT NOT NULL,
    max_guests INT NOT NULL CHECK (max_guests > 0),
    UNIQUE (hotel_id, code));
  CREATE TABLE room (id TEXT PRIMARY KEY,
    room_type_id TEXT NOT NULL REFERENCES room_type(id),
    number TEXT NOT NULL);
  CREATE TABLE guest (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE);
  CREATE TABLE room_inventory (
    room_type_id TEXT REFERENCES room_type(id), night DATE,
    total INT NOT NULL, reserved INT NOT NULL DEFAULT 0,
    rate_minor BIGINT NOT NULL CHECK (rate_minor >= 0),
    PRIMARY KEY (room_type_id, night),
    CHECK (reserved BETWEEN 0 AND total));
  CREATE TABLE reservation (id TEXT PRIMARY KEY,
    guest_id TEXT NOT NULL REFERENCES guest(id),
    room_type_id TEXT NOT NULL REFERENCES room_type(id),
    check_in DATE NOT NULL, check_out DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('HELD','CONFIRMED',
      'CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED','NO_SHOW')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    hold_until TIMESTAMPTZ, room_id TEXT REFERENCES room(id),
    policy TEXT NOT NULL, idempotency_key TEXT UNIQUE,
    CHECK (check_out > check_in),
    EXCLUDE USING gist (room_id WITH =,
      daterange(check_in, check_out) WITH &&)
      WHERE (status IN ('CONFIRMED', 'CHECKED_IN')));
  CREATE INDEX reservation_sweep ON reservation (hold_until)
    WHERE status = 'HELD';                  -- serves the expiry sweeper
  CREATE INDEX reservation_by_guest ON reservation (guest_id, check_in);
  INSERT INTO hotel VALUES ('HT-1', 'Harbour View', 'Asia/Kolkata');
  INSERT INTO room_type VALUES ('DLX', 'HT-1', 'DLX', 2);
  INSERT INTO room VALUES ('R201', 'DLX', '201'), ('R202', 'DLX', '202');
  INSERT INTO guest VALUES ('G-7', 'asha@example.com'),
    ('G-9', 'ben@example.com');
  INSERT INTO room_inventory (room_type_id, night, total, rate_minor)
    SELECT 'DLX', d::date, 2, 650000
    FROM generate_series('2026-03-10'::date, '2026-03-16', '1 day') d;
  INSERT INTO reservation VALUES ('RS-1', 'G-7', 'DLX', '2026-03-10',
    '2026-03-13', 'CONFIRMED', 1950000, NULL, 'R201', 'FLEX', 'k-1');`);

const bad = {
  'zero-night stay': `INSERT INTO reservation VALUES ('RS-2', 'G-9',
    'DLX', '2026-03-12', '2026-03-12', 'HELD', 0, NULL, NULL, 'FLEX', NULL)`,
  'reserved above total': `UPDATE room_inventory SET reserved = 3
    WHERE room_type_id = 'DLX' AND night = '2026-03-10'`,
  'same Idempotency-Key': `INSERT INTO reservation VALUES ('RS-3', 'G-9',
    'DLX', '2026-03-14', '2026-03-15', 'HELD', 0, NULL, NULL, 'FLEX', 'k-1')`,
  'unknown guest': `INSERT INTO reservation VALUES ('RS-4', 'G-404',
    'DLX', '2026-03-14', '2026-03-15', 'HELD', 0, NULL, NULL, 'FLEX', NULL)`,
  'room 201 twice': `INSERT INTO reservation VALUES ('RS-5', 'G-9', 'DLX',
    '2026-03-12', '2026-03-14', 'CONFIRMED', 0, NULL, 'R201', 'FLEX', NULL)`,
};
for (const [label, sql] of Object.entries(bad)) {
  try { await pool.query(sql); console.log(label, '-> accepted?!'); }
  catch (e) { console.log(label, '->', e.code, e.constraint ?? ''); }
}
await pool.query(`INSERT INTO reservation VALUES ('RS-6', 'G-9', 'DLX',
  '2026-03-13', '2026-03-15', 'CONFIRMED', 0, NULL, 'R201', 'FLEX', NULL)`);
console.log('back-to-back stay in room 201 -> accepted');
const { rows } = await pool.query(`SELECT id, room_id, check_in::text,
  check_out::text FROM reservation ORDER BY id`);
console.log(JSON.stringify(rows));
await pool.end();
