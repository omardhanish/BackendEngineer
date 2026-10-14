import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE elevator (id TEXT PRIMARY KEY, current_floor INT NOT NULL,
    state TEXT NOT NULL DEFAULT 'IDLE', version INT NOT NULL DEFAULT 1);
  CREATE TABLE hall_call (id BIGSERIAL PRIMARY KEY, floor_no INT NOT NULL,
    direction TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
    elevator_id TEXT REFERENCES elevator (id));
  CREATE UNIQUE INDEX one_open_call ON hall_call (floor_no, direction)
    WHERE status IN ('PENDING', 'ASSIGNED');
  INSERT INTO elevator (id, current_floor) VALUES ('E1', 0), ('E2', 8);`);

// A press: insert the call, or get the open one if it already exists.
async function press(floor, dir) {
  const ins = await pool.query(`INSERT INTO hall_call (floor_no, direction)
    VALUES ($1, $2) ON CONFLICT (floor_no, direction)
    WHERE status IN ('PENDING', 'ASSIGNED') DO NOTHING RETURNING id`,
    [floor, dir]);
  if (ins.rowCount) return Number(ins.rows[0].id);
  const old = await pool.query(`SELECT id FROM hall_call WHERE floor_no = $1
    AND direction = $2 AND status IN ('PENDING', 'ASSIGNED')`, [floor, dir]);
  return Number(old.rows[0].id);
}

// Assign: lock the PENDING call, pick the nearest car in service.
async function assign(callId) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const call = await c.query(`SELECT floor_no FROM hall_call
      WHERE id = $1 AND status = 'PENDING' FOR UPDATE`, [callId]);
    if (!call.rowCount) { await c.query('ROLLBACK'); return null; }
    const car = await c.query(`SELECT id FROM elevator
      WHERE state <> 'OUT_OF_SERVICE'
      ORDER BY abs(current_floor - $1), id LIMIT 1`, [call.rows[0].floor_no]);
    if (!car.rowCount) { await c.query('ROLLBACK'); return null; }
    await c.query(`UPDATE hall_call SET status = 'ASSIGNED',
      elevator_id = $2 WHERE id = $1`, [callId, car.rows[0].id]);
    await c.query('COMMIT');
    return car.rows[0].id;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

const ids = await Promise.all([press(5, 'UP'), press(5, 'UP')]);
console.log('two presses, same call id:', ids[0] === ids[1]);
const cars = await Promise.all([assign(ids[0]), assign(ids[0])]);
console.log('assignments made:', cars.filter(Boolean).length,
  'car:', cars.find(Boolean));

// Optimistic locking: the controller read version 1, then the operator
// took E2 out of service first. The controller's stale write must fail.
const setState = (id, state, version) => pool.query(`UPDATE elevator
  SET state = $2, version = version + 1 WHERE id = $1 AND version = $3`,
  [id, state, version]);
console.log('operator update rows:',
  (await setState('E2', 'OUT_OF_SERVICE', 1)).rowCount);
console.log('controller stale update rows:',
  (await setState('E2', 'MOVING', 1)).rowCount);

// Failover: release E2's open calls and assign them again.
const freed = await pool.query(`UPDATE hall_call SET status = 'PENDING',
  elevator_id = NULL WHERE elevator_id = 'E2' AND status = 'ASSIGNED'
  RETURNING id`);
for (const r of freed.rows) await assign(r.id);
const end = await pool.query(`SELECT floor_no, direction, status,
  elevator_id FROM hall_call ORDER BY id`);
const e2 = await pool.query(`SELECT state, version FROM elevator
  WHERE id = 'E2'`);
console.log(JSON.stringify(end.rows), JSON.stringify(e2.rows[0]));
await pool.end();
