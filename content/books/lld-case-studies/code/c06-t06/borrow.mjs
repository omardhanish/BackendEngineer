import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE SEQUENCE loan_seq;
  CREATE TABLE book_copy (id TEXT PRIMARY KEY, isbn TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE', held_for TEXT);
  CREATE TABLE member (id TEXT PRIMARY KEY, max_loans INT NOT NULL);
  CREATE TABLE loan (id TEXT PRIMARY KEY, copy_id TEXT NOT NULL,
    member_id TEXT NOT NULL, due_on DATE NOT NULL, returned_on DATE);
  CREATE UNIQUE INDEX ON loan (copy_id) WHERE returned_on IS NULL;
  CREATE TABLE reservation (id TEXT PRIMARY KEY, isbn TEXT NOT NULL,
    member_id TEXT NOT NULL, status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL, ready_until DATE);
  INSERT INTO book_copy (id, isbn) VALUES ('CP-1','ISBN-1'),
    ('CP-5','ISBN-2'), ('CP-6','ISBN-3');
  INSERT INTO book_copy VALUES ('CP-9','ISBN-9','ON_LOAN',NULL);
  INSERT INTO member VALUES ('M-1',5), ('M-2',5), ('M-3',2), ('M-4',5);
  INSERT INTO loan VALUES ('LN-0','CP-9','M-3','2026-01-20',NULL);`);
class Refused extends Error {}
async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) {
    await c.query('ROLLBACK');
    if (e instanceof Refused) return e.message; throw e;
  } finally { c.release(); }
}
const borrow = (memberId, isbn, today) => tx(async (c) => {
  const m = await c.query(`SELECT max_loans FROM member WHERE id = $1
    FOR UPDATE`, [memberId]);      // one borrow at a time per member
  const open = await c.query(`SELECT count(*)::int AS n FROM loan
    WHERE member_id = $1 AND returned_on IS NULL`, [memberId]);
  if (open.rows[0].n >= m.rows[0].max_loans) throw new Refused('LIMIT');
  const cp = await c.query(`SELECT id FROM book_copy WHERE isbn = $1
    AND (status = 'AVAILABLE'
      OR (status = 'ON_HOLD_SHELF' AND held_for = $2))
    ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`, [isbn, memberId]);
  if (!cp.rowCount) throw new Refused('NO_COPY');
  await c.query(`UPDATE book_copy SET status = 'ON_LOAN', held_for = NULL
    WHERE id = $1`, [cp.rows[0].id]);
  await c.query(`UPDATE reservation SET status = 'FULFILLED'
    WHERE member_id = $1 AND isbn = $2 AND status = 'READY'`,
    [memberId, isbn]);
  const { rows } = await c.query(`INSERT INTO loan VALUES
    ('LN-' || nextval('loan_seq'), $1, $2, $3::date + 14, NULL)
    RETURNING id`, [cp.rows[0].id, memberId, today]);
  return rows[0].id;
});
const giveBack = (copyId, today) => tx(async (c) => {
  const loan = await c.query(`UPDATE loan SET returned_on = $2
    WHERE copy_id = $1 AND returned_on IS NULL
    RETURNING LEAST(GREATEST($2::date - due_on, 0) * 1000, 10000)
      AS fine_minor`, [copyId, today]);
  if (!loan.rowCount) throw new Refused('NOT_ON_LOAN');   // double scan
  const next = await c.query(`SELECT r.id, r.member_id FROM reservation r
    JOIN book_copy b ON b.isbn = r.isbn AND b.id = $1
    WHERE r.status = 'WAITING' ORDER BY r.created_at, r.id
    LIMIT 1 FOR UPDATE OF r`, [copyId]);    // FIFO: wait, never skip
  const heldFor = next.rows[0]?.member_id ?? null;
  if (heldFor) await c.query(`UPDATE reservation SET status = 'READY',
    ready_until = $2::date + 3 WHERE id = $1`, [next.rows[0].id, today]);
  await c.query(`UPDATE book_copy SET held_for = $2::text, status = CASE
    WHEN $2::text IS NULL THEN 'AVAILABLE' ELSE 'ON_HOLD_SHELF' END
    WHERE id = $1`, [copyId, heldFor]);
  return { fineMinor: Number(loan.rows[0].fine_minor), heldFor };
});

const D = '2026-01-05';
const race = await Promise.all([borrow('M-1', 'ISBN-1', D),
  borrow('M-2', 'ISBN-1', D)]);
console.log('last copy, two members:', race.map((r) =>
  r.startsWith('LN-') ? 'loan' : r).sort());
const limit = await Promise.all([borrow('M-3', 'ISBN-2', D),
  borrow('M-3', 'ISBN-3', D)]);
console.log('M-3 at 1 of 2, two borrows:', limit.map((r) =>
  r.startsWith('LN-') ? 'loan' : r).sort());
await pool.query(`INSERT INTO reservation VALUES
  ('RS-1', 'ISBN-1', 'M-4', 'WAITING', '2026-01-06 09:00+00', NULL)`);
console.log('return CP-1:', await giveBack('CP-1', '2026-01-22'));
console.log('return CP-1 again:', await giveBack('CP-1', '2026-01-22'));
console.log('M-1 borrows:', await borrow('M-1', 'ISBN-1', '2026-01-23'));
console.log('M-4 borrows:', await borrow('M-4', 'ISBN-1', '2026-01-23'));
const copies = await pool.query(`SELECT status, count(*)::int AS n
  FROM book_copy GROUP BY status ORDER BY status`);
console.log(JSON.stringify(copies.rows));
await pool.end();
