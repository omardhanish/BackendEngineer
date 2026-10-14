import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pg.types.setTypeParser(20, Number);          // BIGINT as a JS number
await pool.query(`CREATE TABLE fs_node (id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES fs_node (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name <> '' AND strpos(name, '/') = 0),
  kind TEXT NOT NULL CHECK (kind IN ('DIR', 'FILE')),
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  UNIQUE NULLS NOT DISTINCT (parent_id, name));
  INSERT INTO fs_node (parent_id, name, kind) VALUES (NULL, 'root', 'DIR');`);
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
const q = async (sql, args) => (await pool.query(sql, args)).rows;
const repo = {                                    // SQL only, no rules
  child: async (parentId, name) => (await q(`SELECT id, kind FROM fs_node
    WHERE parent_id = $1 AND name = $2`, [parentId, name]))[0],
  insert: (...args) => q(`INSERT INTO fs_node (parent_id, name, kind,
    size_bytes) VALUES ($1, $2, $3, $4)`, args),
  list: (id) => q(`SELECT name, kind, size_bytes AS "sizeBytes"
    FROM fs_node WHERE parent_id = $1 ORDER BY name`, [id]),
  du: async (id) => (await q(`WITH RECURSIVE sub AS (
    SELECT id, size_bytes FROM fs_node WHERE id = $1 UNION ALL
    SELECT n.id, n.size_bytes FROM fs_node n JOIN sub ON n.parent_id = sub.id)
    SELECT sum(size_bytes)::bigint AS "totalBytes", count(*) AS nodes
    FROM sub`, [id]))[0],
  remove: (id) => q('DELETE FROM fs_node WHERE id = $1', [id]),
};
const ROOT_ID = 1, names = (path) => path.split('/').filter(Boolean);
const service = {                                 // path rules live here
  async resolve(parts, dir = false) {
    let node = { id: ROOT_ID, kind: 'DIR' };
    for (const name of parts) {
      if (node.kind !== 'DIR') throw new AppError(409, 'NOT_A_DIRECTORY');
      node = await repo.child(node.id, name);
      if (!node) throw new AppError(404, 'NOT_FOUND');
    }
    if (dir && node.kind !== 'DIR') throw new AppError(409, 'NOT_A_DIRECTORY');
    return node;
  },
  async create(path, kind, size) {
    const parts = names(path);                    // never empty: see Create
    const parent = await this.resolve(parts.slice(0, -1), true);
    await repo.insert(parent.id, parts.at(-1), kind, size).catch((e) => {
      throw e.code === '23505' ? new AppError(409, 'ALREADY_EXISTS')
        : e.code === '23503' ? new AppError(404, 'PARENT_GONE') : e;
    });
  },
};
const Path = z.string().regex(/^\/([^/]+(\/[^/]+)*)?$/)
  .refine((p) => !names(p).some((n) => n === '.' || n === '..'));
const Create = z.object({ path: Path.refine((p) => p !== '/'), kind:
  z.enum(['DIR', 'FILE']), sizeBytes: z.number().int().min(0).default(0) });
const pathOf = (req) => names(Path.parse(req.query.path));
const app = express().use(express.json());        // controllers
app.post('/files', async (req, res) => {
  const b = Create.parse(req.body);
  await service.create(b.path, b.kind, b.sizeBytes); res.status(201).json(b);
});
app.get('/ls', async (req, res) =>
  res.json(await repo.list((await service.resolve(pathOf(req), true)).id)));
app.get('/du', async (req, res) =>
  res.json(await repo.du((await service.resolve(pathOf(req))).id)));
app.delete('/files', async (req, res) => {        // the subtree cascades
  const { id } = await service.resolve(pathOf(req));
  if (id === ROOT_ID) throw new AppError(409, 'ROOT_IS_FIXED');
  await repo.remove(id); res.json({ deleted: req.query.path });
});
app.use((err, req, res, next) => {                // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function call(method, url, body) {          // one output line
  const r = await fetch(base + url, { method, body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' } });
  return [method, body?.path ?? url, r.status, JSON.stringify(await r.json())];
}
const show = async (...args) => console.log(...await call(...args));
const file = (path, sizeBytes = 1) => ({ path, kind: 'FILE', sizeBytes });
for (const b of [{ path: '/docs', kind: 'DIR' }, file('/docs/cv.pdf', 1200),
  file('/docs/notes.txt', 300), file('/docs/cv.pdf/x'), file('/tmp/a.txt'),
  file('docs/../etc')]) await show('POST', '/files', b);
const race = await Promise.all([1, 2].map(() =>   // same request, twice
  call('POST', '/files', file('/docs/plan.txt', 50))));
console.log('race statuses', JSON.stringify(race.map((r) => r[2]).sort()));
for (const [m, u] of [['GET', '/ls?path=/docs'], ['GET', '/du?path=/'],
  ['DELETE', '/files?path=/docs'], ['GET', '/du?path=/']]) await show(m, u);
srv.close(); await pool.end();
