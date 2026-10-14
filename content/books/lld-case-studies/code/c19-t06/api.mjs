import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE task (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL,
  priority INT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 9),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN
    ('SCHEDULED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  idempotency_key TEXT UNIQUE)`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
const repo = {                                 // SQL only
  insert: (t, key) => pool.query(`INSERT INTO task (name, run_at, priority,
    max_attempts, idempotency_key) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
    [t.name, t.runAt, t.priority, t.maxAttempts, key]),
  byKey: (key) => pool.query(
    'SELECT * FROM task WHERE idempotency_key = $1', [key]),
  byId: (id) => pool.query('SELECT * FROM task WHERE id = $1', [id]),
  cancel: (id) => pool.query(`UPDATE task SET status = 'CANCELLED'
    WHERE id = $1 AND status = 'SCHEDULED' RETURNING *`, [id]),
};
const toJson = (r) => ({ id: `T-${r.id}`, name: r.name,
  runAt: r.run_at.toISOString(), priority: r.priority, status: r.status });
const service = {                              // rules, no HTTP
  async create(input, key) {
    const [row] = (await repo.insert(input, key)).rows;
    if (row) return { created: true, task: toJson(row) };
    return { created: false, task: toJson((await repo.byKey(key)).rows[0]) };
  },
  async get(id) {
    const [row] = (await repo.byId(id)).rows;
    if (!row) throw new AppError(404, 'TASK_NOT_FOUND');
    return toJson(row);
  },
  async cancel(id) {
    const [row] = (await repo.cancel(id)).rows;
    if (row) return toJson(row);
    await this.get(id);                        // 404 if it never existed
    throw new AppError(409, 'TASK_NOT_CANCELLABLE');
  },
};
const TaskBody = z.object({ name: z.string().min(1).max(60),
  runAt: z.iso.datetime({ offset: true }),
  priority: z.number().int().min(0).max(9).default(0),
  maxAttempts: z.number().int().min(1).max(10).default(3) });
const idOf = (req) => z.coerce.number().int().positive()
  .parse(req.params.id.replace(/^T-/, ''));
const app = express().use(express.json());
app.post('/tasks', async (req, res) => {           // controllers
  const key = req.get('Idempotency-Key');
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { created, task } = await service.create(TaskBody.parse(req.body), key);
  res.status(created ? 201 : 200).json(task);
});
app.get('/tasks/:id', async (req, res) =>
  res.json(await service.get(idOf(req))));
app.delete('/tasks/:id', async (req, res) =>
  res.json(await service.cancel(idOf(req))));
app.use((err, req, res, next) => {                 // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function call(method, path, body, key) {
  const headers = { 'content-type': 'application/json' };
  if (key) headers['Idempotency-Key'] = key;
  const r = await fetch(base + path, { method, headers,
    body: body && JSON.stringify(body) });
  console.log(method, path, r.status, JSON.stringify(await r.json()));
}
const report = { name: 'send-report', runAt: '2026-01-15T10:00:00Z',
  priority: 2 };
await call('POST', '/tasks', report, 'req-1');
await call('POST', '/tasks', report, 'req-1');      // client retried
await call('POST', '/tasks', { name: '', priority: 12 }, 'req-2');
await call('GET', '/tasks/T-1');
await call('GET', '/tasks/T-99');
await call('DELETE', '/tasks/T-1');
await call('DELETE', '/tasks/T-1');
srv.close(); await pool.end();
