import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE slot (id TEXT PRIMARY KEY,
    places_left INT NOT NULL CHECK (places_left >= 0),
    version INT NOT NULL DEFAULT 1);
  INSERT INTO slot (id, places_left) VALUES ('SL-1', 2), ('SL-2', 2),
    ('SL-3', 2);`);
const row = async (c, id) => (await c.query(
  'SELECT places_left, version FROM slot WHERE id = $1', [id])).rows[0];
const a = await pool.connect(), b = await pool.connect();

// 1. No protection: both read 2, both write 1. One booking is lost.
const seenA = await row(a, 'SL-1'), seenB = await row(b, 'SL-1');
const setLeft = 'UPDATE slot SET places_left = $2 WHERE id = $1';
await a.query(setLeft, ['SL-1', seenA.places_left - 1]);
await b.query(setLeft, ['SL-1', seenB.places_left - 1]);
console.log('no lock, 2 bookings -> left', (await row(pool, 'SL-1')));

// 2. Pessimistic: FOR UPDATE makes the next reader wait for COMMIT.
async function bookLocked(id) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [s] } = await c.query(
      'SELECT places_left FROM slot WHERE id = $1 FOR UPDATE', [id]);
    if (s.places_left === 0) { await c.query('ROLLBACK'); return 'FULL'; }
    await c.query(setLeft, [id, s.places_left - 1]);
    await c.query('COMMIT');
    return 'OK';
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const locked = await Promise.all([1, 2, 3].map(() => bookLocked('SL-2')));
console.log('FOR UPDATE, 3 bookings ->', locked.sort().join(' '),
  '-> left', await row(pool, 'SL-2'));

// 3. Optimistic: write only if the version is still the one you read.
async function bookIfUnchanged(c, id, seen) {
  const r = await c.query(`UPDATE slot SET places_left = places_left - 1,
    version = version + 1 WHERE id = $1 AND version = $2
    AND places_left > 0`, [id, seen.version]);
  return r.rowCount === 1 ? 'OK' : 'CONFLICT';
}
const vA = await row(a, 'SL-3'), vB = await row(b, 'SL-3');
console.log('A writes v' + vA.version, await bookIfUnchanged(a, 'SL-3', vA));
console.log('B writes v' + vB.version, await bookIfUnchanged(b, 'SL-3', vB));
const again = await row(b, 'SL-3');
console.log('B retries v' + again.version,
  await bookIfUnchanged(b, 'SL-3', again));
console.log('optimistic end ->', await row(pool, 'SL-3'));
a.release(); b.release(); await pool.end();
