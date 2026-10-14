import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE task (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL, priority INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  attempts INT NOT NULL DEFAULT 0, max_attempts INT NOT NULL DEFAULT 3);
  CREATE INDEX task_due ON task (run_at, priority DESC, id)
    WHERE status = 'SCHEDULED';
  INSERT INTO task (name, run_at, priority, max_attempts) VALUES
    ('report-a', '2026-01-15 10:00+00', 1, 3),
    ('report-b', '2026-01-15 10:00+00', 1, 3),
    ('charge',   '2026-01-15 10:00+00', 9, 3),
    ('flaky',    '2026-01-15 10:00+00', 5, 3),
    ('broken',   '2026-01-15 10:00+00', 0, 2),
    ('later',    '2026-01-15 10:05+00', 0, 3)`);
const jobs = {                                    // attempt is 1-based
  flaky: (attempt) => { if (attempt < 2) throw new Error('timeout'); },
  broken: () => { throw new Error('bad input'); },
};
// One atomic claim: lock the best due row, skipping rows others hold.
const claim = (now) => pool.query(`UPDATE task
  SET status = 'RUNNING', attempts = attempts + 1
  WHERE id = (SELECT id FROM task WHERE status = 'SCHEDULED'
    AND run_at <= $1 ORDER BY run_at, priority DESC, id
    FOR UPDATE SKIP LOCKED LIMIT 1)
  RETURNING id, name, attempts, max_attempts`, [now]);
async function finish(t, error, now) {
  if (!error) return pool.query(
    `UPDATE task SET status = 'SUCCEEDED' WHERE id = $1`, [t.id]);
  if (t.attempts >= t.max_attempts) return pool.query(
    `UPDATE task SET status = 'FAILED' WHERE id = $1`, [t.id]);
  const backoffSecs = 30 * 2 ** (t.attempts - 1);
  return pool.query(`UPDATE task SET status = 'SCHEDULED',
    run_at = $2::timestamptz + make_interval(secs => $3) WHERE id = $1`,
    [t.id, now, backoffSecs]);
}
async function worker(now, claimed) {
  for (;;) {
    const [t] = (await claim(now)).rows;
    if (!t) return;
    claimed.push(t.id);
    let error = null;
    try { jobs[t.name]?.(t.attempts); } catch (e) { error = e; }
    await finish(t, error, now);
  }
}
for (const now of ['2026-01-15 10:00+00', '2026-01-15 10:01+00',
  '2026-01-15 10:05+00']) {
  const claimed = [];
  await Promise.all([worker(now, claimed), worker(now, claimed)]);
  console.log(now.slice(11, 16), 'claims:', claimed.length,
    'distinct:', new Set(claimed).size);
}
const { rows } = await pool.query(`SELECT name, status, attempts
  FROM task ORDER BY id`);
for (const r of rows) console.log(r.name, r.status, r.attempts);
await pool.end();
