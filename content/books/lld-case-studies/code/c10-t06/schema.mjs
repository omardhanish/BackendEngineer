import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE aircraft (id TEXT PRIMARY KEY, model TEXT NOT NULL);
  CREATE TABLE seat (aircraft_id TEXT REFERENCES aircraft, seat_no TEXT,
    cabin TEXT NOT NULL CHECK (cabin IN ('ECONOMY','BUSINESS')),
    PRIMARY KEY (aircraft_id, seat_no));
  CREATE TABLE flight (id TEXT PRIMARY KEY, flight_no TEXT NOT NULL,
    origin CHAR(3) NOT NULL, destination CHAR(3) NOT NULL,
    departs_at TIMESTAMPTZ NOT NULL,
    aircraft_id TEXT NOT NULL REFERENCES aircraft,
    CHECK (origin <> destination), UNIQUE (flight_no, departs_at));
  CREATE INDEX flight_search ON flight (origin, destination, departs_at);
  CREATE TABLE fare_class (flight_id TEXT REFERENCES flight, code TEXT,
    cabin TEXT NOT NULL CHECK (cabin IN ('ECONOMY','BUSINESS')),
    price_minor BIGINT NOT NULL CHECK (price_minor > 0),
    seats_total INT NOT NULL, seats_left INT NOT NULL,
    CHECK (seats_left BETWEEN 0 AND seats_total),
    PRIMARY KEY (flight_id, code));
  CREATE TABLE booking (pnr TEXT PRIMARY KEY, flight_id TEXT NOT NULL,
    fare_code TEXT NOT NULL, pax_count INT NOT NULL
      CHECK (pax_count BETWEEN 1 AND 9),
    amount_minor BIGINT NOT NULL, status TEXT NOT NULL CHECK (status IN
      ('HELD','CONFIRMED','TICKETED','CANCELLED','EXPIRED')),
    hold_until TIMESTAMPTZ NOT NULL, idempotency_key TEXT UNIQUE,
    FOREIGN KEY (flight_id, fare_code) REFERENCES fare_class);
  CREATE INDEX booking_expiry ON booking (hold_until)
    WHERE status = 'HELD';
  CREATE TABLE ticket (ticket_no TEXT PRIMARY KEY,
    pnr TEXT NOT NULL REFERENCES booking, passenger TEXT NOT NULL,
    flight_id TEXT NOT NULL, seat_no TEXT,
    UNIQUE (pnr, passenger), UNIQUE (flight_id, seat_no));
  INSERT INTO aircraft VALUES ('VT-1', 'A320');
  INSERT INTO seat VALUES ('VT-1','12A','ECONOMY'), ('VT-1','12B','ECONOMY'),
    ('VT-1','12C','ECONOMY');
  INSERT INTO flight VALUES ('F1', 'AI-101', 'BLR', 'DEL',
    '2026-03-01 06:00+00', 'VT-1');
  INSERT INTO fare_class VALUES ('F1', 'Y-SAVER', 'ECONOMY', 450000, 3, 3);
  INSERT INTO booking VALUES ('PNR-1', 'F1', 'Y-SAVER', 3, 1350000,
    'HELD', '2026-02-10 09:15+00', 'k-1');
  INSERT INTO ticket VALUES ('TK-1', 'PNR-1', 'Asha', 'F1', '12A'),
    ('TK-2', 'PNR-1', 'Ravi', 'F1', NULL);`);
console.log('schema ready: 1 flight, 1 fare, PNR-1 with 2 tickets');

const bad = {
  'oversell the fare': `UPDATE fare_class SET seats_left = seats_left - 4
    WHERE flight_id = 'F1'`,
  'same seat twice': `INSERT INTO ticket VALUES
    ('TK-3', 'PNR-1', 'Meera', 'F1', '12A')`,
  'zero passengers': `INSERT INTO booking VALUES ('PNR-2', 'F1',
    'Y-SAVER', 0, 0, 'HELD', '2026-02-10 09:15+00', NULL)`,
  'unknown fare': `INSERT INTO booking VALUES ('PNR-3', 'F1', 'J-FLEX',
    1, 1800000, 'HELD', '2026-02-10 09:15+00', NULL)`,
  'loop route': `INSERT INTO flight VALUES ('F2', 'AI-102', 'DEL', 'DEL',
    '2026-03-01 09:00+00', 'VT-1')`,
};
for (const [name, sql] of Object.entries(bad)) {
  try {
    await pool.query(sql);
    console.log(name, '-> accepted (bug!)');
  } catch (e) {
    console.log(name, '->', e.code, e.constraint);
  }
}
const seatless = await pool.query(`INSERT INTO ticket VALUES
  ('TK-4', 'PNR-1', 'Meera', 'F1', NULL) RETURNING ticket_no`);
console.log('second ticket without a seat ->', seatless.rows[0].ticket_no);
await pool.end();
