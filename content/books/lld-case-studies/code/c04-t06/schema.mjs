import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE building (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE floor (building_id TEXT REFERENCES building (id),
    floor_no INT, PRIMARY KEY (building_id, floor_no));
  CREATE TABLE elevator (id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL, current_floor INT NOT NULL,
    state TEXT NOT NULL DEFAULT 'IDLE' CHECK (state IN
      ('IDLE', 'MOVING', 'DOORS_OPEN', 'OUT_OF_SERVICE')),
    max_passengers INT NOT NULL CHECK (max_passengers > 0),
    version INT NOT NULL DEFAULT 1,
    FOREIGN KEY (building_id, current_floor)
      REFERENCES floor (building_id, floor_no));
  CREATE TABLE hall_call (id BIGSERIAL PRIMARY KEY,
    building_id TEXT NOT NULL, floor_no INT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('UP', 'DOWN')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN
      ('PENDING', 'ASSIGNED', 'SERVED', 'CANCELLED')),
    elevator_id TEXT REFERENCES elevator (id),
    created_at TIMESTAMPTZ NOT NULL, served_at TIMESTAMPTZ,
    FOREIGN KEY (building_id, floor_no)
      REFERENCES floor (building_id, floor_no),
    CONSTRAINT assigned_has_car CHECK
      (status NOT IN ('ASSIGNED', 'SERVED') OR elevator_id IS NOT NULL));
  -- one open call per button: repeat presses cannot duplicate it
  CREATE UNIQUE INDEX one_open_call ON hall_call
    (building_id, floor_no, direction)
    WHERE status IN ('PENDING', 'ASSIGNED');
  -- serves "which stops does car E2 owe?" and failover reassignment
  CREATE INDEX open_calls_by_car ON hall_call (elevator_id)
    WHERE status = 'ASSIGNED';`);

await pool.query(`INSERT INTO building VALUES ('B1', 'Tower');
  INSERT INTO floor SELECT 'B1', n FROM generate_series(0, 9) n;
  INSERT INTO elevator (id, building_id, current_floor, max_passengers)
    VALUES ('E1', 'B1', 0, 8), ('E2', 'B1', 8, 8);`);

const T = '2026-01-15 09:00+00';
const call = (floor, dir, status = 'PENDING') => pool.query(`INSERT INTO
  hall_call (building_id, floor_no, direction, status, created_at)
  VALUES ('B1', $1, $2, $3, $4)`, [floor, dir, status, T]);

async function attempt(label, write) {
  try {
    await write();
    console.log('ok     ', label);
  } catch (e) {
    console.log('refused', label, e.code, e.constraint);
  }
}
await attempt('5 UP first press', () => call(5, 'UP'));
await attempt('5 UP second press', () => call(5, 'UP'));
await attempt('5 DOWN (other button)', () => call(5, 'DOWN'));
await attempt('floor 12 UP', () => call(12, 'UP'));
await attempt('5 SIDEWAYS', () => call(5, 'SIDEWAYS'));
await attempt('ASSIGNED without car', () => call(2, 'UP', 'ASSIGNED'));
await attempt('E2 at floor 40', () => pool.query(
  `UPDATE elevator SET current_floor = 40 WHERE id = 'E2'`));
await pool.query(`UPDATE hall_call SET status = 'SERVED',
  elevator_id = 'E2', served_at = '2026-01-15 09:01+00'
  WHERE floor_no = 5 AND direction = 'UP'`);
await attempt('5 UP after it was served', () => call(5, 'UP'));

const { rows } = await pool.query(`SELECT floor_no, direction, status
  FROM hall_call ORDER BY id`);
console.log(JSON.stringify(rows));
await pool.end();
