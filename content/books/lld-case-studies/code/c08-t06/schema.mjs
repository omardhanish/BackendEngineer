import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE TABLE movie (id TEXT PRIMARY KEY, title TEXT NOT NULL,
    duration_min INT NOT NULL CHECK (duration_min > 0));
  CREATE TABLE screen (id TEXT PRIMARY KEY, theatre_id TEXT NOT NULL,
    name TEXT NOT NULL);
  CREATE TABLE seat (screen_id TEXT NOT NULL REFERENCES screen,
    seat_no TEXT NOT NULL,
    seat_type TEXT NOT NULL CHECK (seat_type IN ('REGULAR','PREMIUM')),
    PRIMARY KEY (screen_id, seat_no));
  CREATE TABLE show (id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movie,
    screen_id TEXT NOT NULL REFERENCES screen,
    starts_at TIMESTAMPTZ NOT NULL);
  CREATE INDEX show_by_screen_time ON show (screen_id, starts_at);
  CREATE TABLE show_seat (show_id TEXT NOT NULL REFERENCES show,
    seat_no TEXT NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    status TEXT NOT NULL DEFAULT 'AVAILABLE'
      CHECK (status IN ('AVAILABLE','HELD','BOOKED')),
    hold_id TEXT, held_until TIMESTAMPTZ, booking_id TEXT,
    PRIMARY KEY (show_id, seat_no),
    CHECK (status <> 'HELD' OR (hold_id IS NOT NULL
      AND held_until IS NOT NULL)));
  CREATE INDEX show_seat_holds ON show_seat (held_until)
    WHERE status = 'HELD';
  CREATE TABLE booking (id TEXT PRIMARY KEY,
    show_id TEXT NOT NULL REFERENCES show, user_id TEXT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    status TEXT NOT NULL CHECK (status IN
      ('PENDING','CONFIRMED','EXPIRED','CANCELLED')),
    idempotency_key TEXT NOT NULL UNIQUE);
`);

await pool.query(`
  INSERT INTO movie VALUES ('MV-1', 'Night Train', 128);
  INSERT INTO screen VALUES ('SC-1', 'TH-1', 'Audi 1');
  INSERT INTO seat VALUES ('SC-1','A1','REGULAR'), ('SC-1','A2','REGULAR'),
    ('SC-1','P1','PREMIUM');
  INSERT INTO show VALUES ('SH-1','MV-1','SC-1','2026-01-15 18:30+00');
  INSERT INTO show_seat (show_id, seat_no, price_minor)
    SELECT 'SH-1', seat_no,
      CASE seat_type WHEN 'PREMIUM' THEN 40000 ELSE 25000 END
    FROM seat WHERE screen_id = 'SC-1';
`);

const map = await pool.query(`SELECT seat_no, price_minor, status
  FROM show_seat WHERE show_id = 'SH-1' ORDER BY seat_no`);
for (const r of map.rows)
  console.log(r.seat_no, r.price_minor, r.status);

async function tryWrite(label, sql) {
  try {
    await pool.query(sql);
    console.log(label, '-> ok');
  } catch (e) {
    console.log(label, '->', e.code, e.constraint ?? '');
  }
}
await tryWrite('HELD without hold_id', `UPDATE show_seat
  SET status = 'HELD' WHERE seat_no = 'A1'`);
await tryWrite('second row for A1', `INSERT INTO show_seat
  (show_id, seat_no, price_minor) VALUES ('SH-1','A1',25000)`);
await tryWrite('show for unknown movie', `INSERT INTO show
  VALUES ('SH-9','MV-404','SC-1','2026-01-15 21:00+00')`);
await tryWrite('first booking', `INSERT INTO booking
  VALUES ('BK-1','SH-1','U-7',65000,'PENDING','key-1')`);
await tryWrite('same Idempotency-Key', `INSERT INTO booking
  VALUES ('BK-2','SH-1','U-7',65000,'PENDING','key-1')`);
await pool.end();
