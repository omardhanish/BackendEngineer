import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE TABLE account (id TEXT PRIMARY KEY,
    balance_minor BIGINT NOT NULL CHECK (balance_minor >= 0),
    daily_limit_minor BIGINT NOT NULL CHECK (daily_limit_minor > 0));
  CREATE TABLE card (card_token TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account,
    pin_hash TEXT NOT NULL, expires_on DATE NOT NULL,
    failed_pins INT NOT NULL DEFAULT 0 CHECK (failed_pins BETWEEN 0 AND 3),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE','BLOCKED','RETAINED')));
  CREATE TABLE atm (id TEXT PRIMARY KEY, status TEXT NOT NULL
    CHECK (status IN ('IN_SERVICE','OUT_OF_SERVICE')));
  CREATE TABLE atm_cassette (atm_id TEXT NOT NULL REFERENCES atm,
    note_minor BIGINT NOT NULL CHECK (note_minor > 0),
    note_count INT NOT NULL CHECK (note_count >= 0),
    PRIMARY KEY (atm_id, note_minor));
  CREATE TABLE atm_transaction (id BIGSERIAL PRIMARY KEY,
    atm_id TEXT NOT NULL REFERENCES atm, request_id TEXT NOT NULL,
    account_id TEXT NOT NULL REFERENCES account,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    status TEXT NOT NULL CHECK (status IN
      ('PENDING','COMPLETED','REVERSED','DECLINED')),
    created_at TIMESTAMPTZ NOT NULL, UNIQUE (atm_id, request_id));
  CREATE INDEX atm_tx_daily ON atm_transaction (account_id, created_at)
    WHERE status IN ('PENDING','COMPLETED');
`);
await pool.query(`
  INSERT INTO account VALUES ('AC-1', 500000, 2500000);
  INSERT INTO card (card_token, account_id, pin_hash, expires_on)
    VALUES ('tok-4444', 'AC-1', 'scrypt$demo', '2028-03-31');
  INSERT INTO atm VALUES ('ATM-7', 'IN_SERVICE');
  INSERT INTO atm_cassette VALUES ('ATM-7', 200000, 2),
    ('ATM-7', 50000, 4), ('ATM-7', 10000, 5);
`);

async function tryWrite(label, sql) {
  try {
    await pool.query(sql);
    console.log(label, '-> ok');
  } catch (e) {
    console.log(label, '->', e.code, e.constraint ?? '');
  }
}
await tryWrite('withdrawal R-1', `INSERT INTO atm_transaction (atm_id,
  request_id, account_id, amount_minor, status, created_at) VALUES
  ('ATM-7','R-1','AC-1',200000,'COMPLETED','2026-01-15 10:00+00')`);
await tryWrite('same request R-1 again', `INSERT INTO atm_transaction
  (atm_id, request_id, account_id, amount_minor, status, created_at)
  VALUES ('ATM-7','R-1','AC-1',200000,'PENDING','2026-01-15 10:01+00')`);
await tryWrite('overdraw AC-1', `UPDATE account
  SET balance_minor = balance_minor - 900000 WHERE id = 'AC-1'`);
await tryWrite('take 3 notes of 2000', `UPDATE atm_cassette
  SET note_count = note_count - 3 WHERE note_minor = 200000`);
await tryWrite('card for unknown account', `INSERT INTO card
  (card_token, account_id, pin_hash, expires_on)
  VALUES ('tok-9999', 'AC-404', 'x', '2028-01-31')`);

// The daily-limit query, served by the partial index atm_tx_daily.
const used = await pool.query(`SELECT coalesce(sum(amount_minor), 0)
  AS used FROM atm_transaction WHERE account_id = 'AC-1'
  AND status IN ('PENDING','COMPLETED')
  AND created_at >= '2026-01-15 00:00+00'
  AND created_at < '2026-01-16 00:00+00'`);
console.log('used today:', used.rows[0].used);
await pool.end();
