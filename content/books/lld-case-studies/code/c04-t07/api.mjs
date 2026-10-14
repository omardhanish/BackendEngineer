import express from 'express';
import pg from 'pg'; import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE floor (building_id TEXT, floor_no INT,
    PRIMARY KEY (building_id, floor_no));
  CREATE TABLE elevator (id TEXT PRIMARY KEY, building_id TEXT NOT NULL,
    current_floor INT, state TEXT DEFAULT 'IDLE', version INT DEFAULT 1);
  CREATE TABLE hall_call (id BIGSERIAL PRIMARY KEY, building_id TEXT,
    floor_no INT, direction TEXT, elevator_id TEXT, status TEXT NOT NULL
    DEFAULT 'PENDING', FOREIGN KEY (building_id, floor_no) REFERENCES floor);
  CREATE UNIQUE INDEX one_open_call ON hall_call (building_id, floor_no,
    direction) WHERE status IN ('PENDING', 'ASSIGNED');
  INSERT INTO floor SELECT 'B1', n FROM generate_series(0, 9) n;
  INSERT INTO elevator VALUES ('E1', 'B1', 0), ('E2', 'B1', 8);`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                 // one transaction per service call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const OPEN = `status IN ('PENDING', 'ASSIGNED')`;
const repo = {                          // SQL only: no HTTP, no rules
  insertCall: (c, ...v) => c.query(`INSERT INTO hall_call (building_id,
    floor_no, direction) VALUES ($1, $2, $3) ON CONFLICT (building_id,
    floor_no, direction) WHERE ${OPEN} DO NOTHING RETURNING *`, v),
  openCall: (c, ...v) => c.query(`SELECT * FROM hall_call WHERE ${OPEN}
    AND building_id = $1 AND floor_no = $2 AND direction = $3`, v),
  nearestCar: (c, b, f) => c.query(`SELECT id FROM elevator WHERE
    building_id = $1 AND state <> 'OUT_OF_SERVICE'
    ORDER BY abs(current_floor - $2), id LIMIT 1`, [b, f]),
  assign: (c, id, car) => c.query(`UPDATE hall_call SET status = 'ASSIGNED',
    elevator_id = $2 WHERE id = $1 RETURNING *`, [id, car]),
  exists: (c, id) => c.query('SELECT 1 FROM elevator WHERE id = $1', [id]),
  setState: (c, ...v) => c.query(`UPDATE elevator SET state = $2,
    version = version + 1 WHERE id = $1 AND version = $3 RETURNING *`, v),
  release: (c, car) => c.query(`UPDATE hall_call SET status = 'PENDING',
    elevator_id = NULL WHERE elevator_id = $1 AND ${OPEN}`, [car]),
};
const service = {                       // business rules, one transaction
  hallCall: (b, floor, dir) => tx(async (c) => {
    const [made] = (await repo.insertCall(c, b, floor, dir)).rows;
    if (!made) return [200, (await repo.openCall(c, b, floor, dir)).rows[0]];
    const [car] = (await repo.nearestCar(c, b, floor)).rows;
    if (!car) return [201, made];       // stays PENDING until a car is free
    return [201, (await repo.assign(c, made.id, car.id)).rows[0]];
  }),
  setState: (id, state, version) => tx(async (c) => {
    const [car] = (await repo.setState(c, id, state, version)).rows;
    if (!car) throw new AppError(...((await repo.exists(c, id)).rowCount
      ? [409, 'STALE_VERSION'] : [404, 'ELEVATOR_NOT_FOUND']));
    const released = state === 'OUT_OF_SERVICE'   // dispatcher re-assigns
      ? (await repo.release(c, id)).rowCount : 0;
    return { id, state: car.state, version: car.version, released };
  }),
};
const app = express().use(express.json());
app.post('/buildings/:buildingId/hall-calls', async (req, res) => {
  const { floor, direction } = z.object({ floor: z.number().int(),
    direction: z.enum(['UP', 'DOWN']) }).parse(req.body);
  const [status, r] = await service.hallCall(req.params.buildingId,
    floor, direction);
  res.status(status).json({ id: `HC-${r.id}`, floor: r.floor_no,
    direction: r.direction, status: r.status, elevatorId: r.elevator_id });
});
app.patch('/elevators/:id/state', async (req, res) => {
  const { state, version } = z.object({ version: z.number().int(),
    state: z.enum(['OUT_OF_SERVICE', 'IDLE']) }).parse(req.body);
  res.json(await service.setState(req.params.id, state, version));
});
app.use((err, req, res, next) => {                      // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.type === 'entity.parse.failed' ? [400, 'BAD_JSON']
    : err.code === '23503' ? [404, 'FLOOR_NOT_FOUND'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function send(method, path, body) {
  const r = await fetch(base + path, { method, body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' } });
  console.log(method, path, r.status, JSON.stringify(await r.json()));
}
const HC = '/buildings/B1/hall-calls', E2 = '/elevators/E2/state';
for (const n of [5, 5]) await send('POST', HC, { floor: n, direction: 'UP' });
await send('POST', HC, { floor: 5, direction: 'SIDEWAYS' });
await send('POST', HC, { floor: 12, direction: 'UP' });
await send('PATCH', E2, { state: 'OUT_OF_SERVICE', version: 1 });
await send('PATCH', E2, { state: 'IDLE', version: 1 });
srv.close(); await pool.end();
