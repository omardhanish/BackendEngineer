import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE book (isbn TEXT PRIMARY KEY, title TEXT NOT NULL,
    author TEXT NOT NULL);
  CREATE TABLE book_copy (id TEXT PRIMARY KEY,
    isbn TEXT NOT NULL REFERENCES book,
    held_for TEXT,  -- member id while ON_HOLD_SHELF (member made below)
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN
      ('AVAILABLE','ON_LOAN','ON_HOLD_SHELF','LOST')));
  CREATE INDEX book_copy_isbn_status ON book_copy (isbn, status);
  CREATE TABLE member (id TEXT PRIMARY KEY, name TEXT NOT NULL,
    max_loans INT NOT NULL DEFAULT 5,
    fine_due_minor BIGINT NOT NULL DEFAULT 0 CHECK (fine_due_minor >= 0));
  CREATE TABLE loan (id TEXT PRIMARY KEY,
    copy_id TEXT NOT NULL REFERENCES book_copy,
    member_id TEXT NOT NULL REFERENCES member,
    borrowed_on DATE NOT NULL, due_on DATE NOT NULL,
    returned_on DATE, renewals INT NOT NULL DEFAULT 0
      CHECK (renewals BETWEEN 0 AND 1),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN
      ('ACTIVE','OVERDUE','RETURNED','LOST')),
    CHECK (due_on > borrowed_on));
  -- one open loan per copy; also serves "who has this copy?"
  CREATE UNIQUE INDEX loan_one_open ON loan (copy_id)
    WHERE returned_on IS NULL;
  -- serves the nightly overdue sweep and "my loans"
  CREATE INDEX loan_open_due ON loan (due_on) WHERE returned_on IS NULL;
  CREATE INDEX loan_open_member ON loan (member_id)
    WHERE returned_on IS NULL;
  CREATE TABLE reservation (id TEXT PRIMARY KEY,
    isbn TEXT NOT NULL REFERENCES book,
    member_id TEXT NOT NULL REFERENCES member,
    status TEXT NOT NULL CHECK (status IN
      ('WAITING','READY','FULFILLED','EXPIRED','CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL, ready_until DATE);
  -- one live reservation per member per title; FIFO queue order
  CREATE UNIQUE INDEX reservation_one_live ON reservation (isbn, member_id)
    WHERE status IN ('WAITING','READY');
  CREATE INDEX reservation_queue ON reservation (isbn, created_at)
    WHERE status = 'WAITING';
  INSERT INTO book VALUES ('ISBN-1', 'Quiet Rivers', 'A. Rao');
  INSERT INTO book_copy (id, isbn) VALUES ('CP-1','ISBN-1'),
    ('CP-2','ISBN-1');
  INSERT INTO member (id, name) VALUES ('M-1','Lina'), ('M-2','Omar');
  INSERT INTO loan (id, copy_id, member_id, borrowed_on, due_on) VALUES
    ('LN-1','CP-1','M-1','2026-01-05','2026-01-19');
  INSERT INTO reservation VALUES ('RS-1','ISBN-1','M-2','WAITING',
    '2026-01-06 09:00+00', NULL);`);

async function tryWrite(label, sql) {
  try { await pool.query(sql); console.log(label, '-> ok'); }
  catch (e) { console.log(label, '->', e.code, e.constraint ?? ''); }
}
await tryWrite('second open loan on CP-1', `INSERT INTO loan
  (id, copy_id, member_id, borrowed_on, due_on) VALUES
  ('LN-2','CP-1','M-2','2026-01-06','2026-01-20')`);
await tryWrite('due before borrow', `INSERT INTO loan (id, copy_id,
  member_id, borrowed_on, due_on) VALUES
  ('LN-3','CP-2','M-2','2026-01-06','2026-01-01')`);
await tryWrite('unknown member', `INSERT INTO loan (id, copy_id,
  member_id, borrowed_on, due_on) VALUES
  ('LN-4','CP-2','M-9','2026-01-06','2026-01-20')`);
await tryWrite('M-2 reserves ISBN-1 again', `INSERT INTO reservation
  VALUES ('RS-2','ISBN-1','M-2','WAITING','2026-01-07 09:00+00',NULL)`);
await tryWrite('negative fine', `UPDATE member SET fine_due_minor = -5
  WHERE id = 'M-1'`);

const overdue = await pool.query(`SELECT l.id, l.member_id,
    $1::date - l.due_on AS days_late
  FROM loan l WHERE l.returned_on IS NULL AND l.due_on < $1
  ORDER BY l.due_on, l.id`, ['2026-01-23']);
console.log('overdue on 2026-01-23:', JSON.stringify(overdue.rows));
await pool.end();
