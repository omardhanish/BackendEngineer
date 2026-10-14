import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE floor (floor_no INT PRIMARY KEY);
  CREATE TABLE parking_spot (
    id TEXT PRIMARY KEY,
    floor_no INT NOT NULL REFERENCES floor,
    spot_type TEXT NOT NULL
      CHECK (spot_type IN ('MOTORBIKE', 'COMPACT', 'LARGE')),
    status TEXT NOT NULL DEFAULT 'FREE'
      CHECK (status IN ('FREE', 'OCCUPIED', 'OUT_OF_SERVICE')));
  CREATE INDEX spot_free_idx ON parking_spot (spot_type, floor_no, id)
    WHERE status = 'FREE';                 -- serves spot allocation
  CREATE TABLE ticket (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate TEXT NOT NULL,
    vehicle_type TEXT NOT NULL
      CHECK (vehicle_type IN ('MOTORBIKE', 'CAR', 'TRUCK')),
    spot_id TEXT NOT NULL REFERENCES parking_spot,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'LOST', 'PAID', 'EXITED')),
    entry_at TIMESTAMPTZ NOT NULL,
    exit_at TIMESTAMPTZ,
    CONSTRAINT exit_matches_status
      CHECK ((status = 'EXITED') = (exit_at IS NOT NULL)),
    CONSTRAINT exit_after_entry CHECK (exit_at >= entry_at));
  CREATE UNIQUE INDEX one_car_per_spot ON ticket (spot_id)
    WHERE status <> 'EXITED';              -- also serves exit lookups
  CREATE UNIQUE INDEX one_visit_per_plate ON ticket (plate)
    WHERE status <> 'EXITED';              -- serves lookup by plate
  CREATE TABLE payment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES ticket,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    idempotency_key TEXT NOT NULL UNIQUE);
  CREATE INDEX payment_ticket_idx ON payment (ticket_id);
  INSERT INTO floor VALUES (1), (2);
  INSERT INTO parking_spot (id, floor_no, spot_type) VALUES
    ('F1-C1', 1, 'COMPACT'), ('F1-L1', 1, 'LARGE'), ('F2-C1', 2, 'COMPACT');
  INSERT INTO ticket (plate, vehicle_type, spot_id, entry_at)
    VALUES ('KA01AB1234', 'CAR', 'F1-C1', '2026-01-15 09:00+00');
  INSERT INTO payment (ticket_id, amount_minor, idempotency_key)
    VALUES (1, 15000, 'pay-1');`);

const newTicket = (plate, spot) => [`INSERT INTO ticket (plate, vehicle_type,
  spot_id, entry_at) VALUES ($1, 'CAR', $2, '2026-01-15 10:00+00')`,
  [plate, spot]];                          // values go in as $1, $2 params
const bad = [
  ['second car in F1-C1', ...newTicket('KA05CD5678', 'F1-C1')],
  ['same plate twice', ...newTicket('KA01AB1234', 'F2-C1')],
  ['unknown spot', ...newTicket('KA05CD5678', 'F9-Z9')],
  ['spot type typo', `INSERT INTO parking_spot VALUES ('F2-X1', 2, 'HUGE')`],
  ['EXITED, no exit_at', `UPDATE ticket SET status = 'EXITED' WHERE id = 1`],
  ['same payment key', `INSERT INTO payment (ticket_id, amount_minor,
    idempotency_key) VALUES (1, 15000, 'pay-1')`],
];
for (const [label, sql, params] of bad) {
  try { await pool.query(sql, params); console.log(`${label}: accepted`); }
  catch (e) { console.log(`${label}: ${e.code} ${e.constraint}`); }
}
await pool.query(`UPDATE ticket SET status = 'EXITED',
  exit_at = '2026-01-15 11:30+00' WHERE id = 1`);
await pool.query(...newTicket('KA05CD5678', 'F1-C1'));
const { rows } = await pool.query(`SELECT spot_id, plate, status
  FROM ticket ORDER BY id`);
for (const r of rows) console.log(r.spot_id, r.plate, r.status);
await pool.end();
