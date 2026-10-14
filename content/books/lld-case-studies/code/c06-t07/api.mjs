import express from 'express';
import pg from 'pg';
import { z } from 'zod';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE SEQUENCE loan_seq;
  CREATE TABLE book_copy (id TEXT PRIMARY KEY, isbn TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE', held_for TEXT);
  CREATE TABLE loan (id TEXT PRIMARY KEY, copy_id TEXT NOT NULL,
    member_id TEXT NOT NULL, due_on DATE NOT NULL, returned_on DATE,
    idempotency_key TEXT NOT NULL, UNIQUE (member_id, idempotency_key));
  CREATE TABLE reservation (id SERIAL PRIMARY KEY, isbn TEXT NOT NULL,
    member_id TEXT NOT NULL, status TEXT NOT NULL);
  INSERT INTO book_copy (id, isbn) VALUES ('CP-1', 'ISBN-1');
  INSERT INTO reservation (isbn, member_id, status)
    VALUES ('ISBN-1', 'M-2', 'WAITING');`);
let today = '2026-01-05';                // demo clock: stable output
class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function tx(fn) {                  // one transaction per service call
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c);
    await c.query('COMMIT'); return out;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
const LOAN = `id AS "loanId", copy_id AS "copyId",
  to_char(due_on, 'YYYY-MM-DD') AS "dueOn"`;
const repo = {                           // SQL only: no HTTP, no rules
  byKey: (c, m, k) => c.query(`SELECT ${LOAN} FROM loan
    WHERE member_id = $1 AND idempotency_key = $2`, [m, k]),
  lockCopy: (c, isbn, m) => c.query(`SELECT id FROM book_copy WHERE isbn = $1
    AND (status = 'AVAILABLE' OR held_for = $2)
    ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`, [isbn, m]),
  setCopy: (c, ...v) => c.query(`UPDATE book_copy
    SET status = $2, held_for = $3 WHERE id = $1`, v),
  addLoan: (c, ...v) => c.query(`INSERT INTO loan VALUES ('LN-' ||
    nextval('loan_seq'), $1, $2, $3::date + 14, NULL, $4)
    RETURNING ${LOAN}`, v),
  closeLoan: (c, id) => c.query(`UPDATE loan SET returned_on = $2
    WHERE id = $1 AND returned_on IS NULL RETURNING copy_id,
    LEAST(GREATEST($2::date - due_on, 0) * 1000, 10000) AS fine`, [id, today]),
  takeNext: (c, copyId) => c.query(`UPDATE reservation SET status = 'READY'
    WHERE id = (SELECT r.id FROM reservation r JOIN book_copy b
      ON b.isbn = r.isbn AND b.id = $1 WHERE r.status = 'WAITING'
      ORDER BY r.id LIMIT 1 FOR UPDATE) RETURNING member_id`, [copyId]),
};
const service = {                        // rules, one transaction each
  borrow: (memberId, isbn, key) => tx(async (c) => {
    const prior = (await repo.byKey(c, memberId, key)).rows[0];
    if (prior) return { replay: true, loan: prior };
    const copy = (await repo.lockCopy(c, isbn, memberId)).rows[0];
    if (!copy) throw new AppError(409, 'NO_COPY_AVAILABLE');
    await repo.setCopy(c, copy.id, 'ON_LOAN', null);
    const r = await repo.addLoan(c, copy.id, memberId, today, key);
    return { replay: false, loan: r.rows[0] };
  }),
  giveBack: (loanId) => tx(async (c) => {
    const closed = (await repo.closeLoan(c, loanId)).rows[0];
    if (!closed) throw new AppError(404, 'OPEN_LOAN_NOT_FOUND');
    const heldFor = (await repo.takeNext(c, closed.copy_id)).rows[0]
      ?.member_id ?? null;
    await repo.setCopy(c, closed.copy_id,
      heldFor ? 'ON_HOLD_SHELF' : 'AVAILABLE', heldFor);
    return { fineMinor: Number(closed.fine), heldFor };
  }),
};
const IsbnBody = z.object({ isbn: z.string().regex(/^ISBN-\d+$/) });
const app = express().use(express.json());
app.post('/loans', async (req, res) => {          // controllers: HTTP only
  const key = z.string().min(1).parse(req.get('Idempotency-Key'));
  const { isbn } = IsbnBody.parse(req.body);
  const memberId = z.string().min(1).parse(req.get('X-Member-Id'));
  const out = await service.borrow(memberId, isbn, key);
  res.status(out.replay ? 200 : 201).json(out.loan);
});
app.post('/loans/:id/return', async (req, res) => {
  res.json(await service.giveBack(req.params.id));
});
app.use((err, req, res, next) => {               // error mapping
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message]
    : err.code === '23505' ? [409, 'ALREADY_EXISTS'] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
async function post(path, member, body, key) {
  const r = await fetch(base + path, { method: 'POST', body: JSON.stringify(
    body), headers: { 'content-type': 'application/json',
    'x-member-id': member, ...(key && { 'idempotency-key': key }) } });
  console.log(member, path, r.status, JSON.stringify(await r.json()));
}
await post('/loans', 'M-1', { isbn: 'ISBN-1' }, 'k-1');
await post('/loans', 'M-1', { isbn: 'ISBN-1' }, 'k-1');
await post('/loans', 'M-2', { isbn: 'ISBN-1' }, 'k-7');
await post('/loans', 'M-2', { isbn: 'Quiet Rivers' }, 'k-8');
today = '2026-01-22';
await post('/loans/LN-1/return', 'M-1', {});
await post('/loans/LN-1/return', 'M-1', {});
srv.close(); await pool.end();
