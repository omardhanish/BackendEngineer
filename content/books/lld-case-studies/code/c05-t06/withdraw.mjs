import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE account (id TEXT PRIMARY KEY,
    balance_minor BIGINT NOT NULL CHECK (balance_minor >= 0),
    daily_limit_minor BIGINT NOT NULL);
  CREATE TABLE atm_transaction (id BIGSERIAL PRIMARY KEY,
    atm_id TEXT NOT NULL, request_id TEXT NOT NULL, account_id TEXT NOT NULL
    REFERENCES account, amount_minor BIGINT NOT NULL, status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL, UNIQUE (atm_id, request_id));
  INSERT INTO account VALUES ('AC-1', 100000, 90000);`);
const DAY = ['2026-01-15 00:00+00', '2026-01-16 00:00+00'];

// The critical transaction: lock the account row, then check and write.
async function withdraw(atmId, requestId, amount, at) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const acc = (await c.query(`SELECT balance_minor, daily_limit_minor
      FROM account WHERE id = 'AC-1' FOR UPDATE`)).rows[0];
    const prior = await c.query(`SELECT status FROM atm_transaction
      WHERE atm_id = $1 AND request_id = $2`, [atmId, requestId]);
    if (prior.rowCount) {
      await c.query('COMMIT');
      return `replay ${prior.rows[0].status}`;
    }
    const used = (await c.query(`SELECT coalesce(sum(amount_minor), 0)
      AS n FROM atm_transaction WHERE account_id = 'AC-1'
      AND status IN ('PENDING','COMPLETED')
      AND created_at >= $1 AND created_at < $2`, DAY)).rows[0].n;
    let status = 'PENDING', why = '';
    if (Number(acc.balance_minor) < amount)
      [status, why] = ['DECLINED', ' (funds)'];
    else if (Number(used) + amount > Number(acc.daily_limit_minor))
      [status, why] = ['DECLINED', ' (daily limit)'];
    else await c.query(`UPDATE account SET balance_minor =
      balance_minor - $1 WHERE id = 'AC-1'`, [amount]);
    await c.query(`INSERT INTO atm_transaction (atm_id, request_id,
      account_id, amount_minor, status, created_at)
      VALUES ($1, $2, 'AC-1', $3, $4, $5)`,
      [atmId, requestId, amount, status, at]);
    await c.query('COMMIT');
    return status + why;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

// Reverse a failed dispense: only a PENDING row can flip, so it runs once.
async function reverse(atmId, requestId) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await c.query(`UPDATE atm_transaction SET status = 'REVERSED'
      WHERE atm_id = $1 AND request_id = $2 AND status = 'PENDING'
      RETURNING amount_minor`, [atmId, requestId]);
    if (r.rowCount) await c.query(`UPDATE account SET balance_minor =
      balance_minor + $1 WHERE id = 'AC-1'`, [r.rows[0].amount_minor]);
    await c.query('COMMIT');
    return r.rowCount;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

const T = '2026-01-15 10:00+00';
const race = await Promise.all([withdraw('ATM-1', 'R-1', 80000, T),
  withdraw('ATM-2', 'R-1', 80000, T)]);
const winner = race[0] === 'PENDING' ? 'ATM-1' : 'ATM-2';
console.log('two ATMs at once:', JSON.stringify([...race].sort()));
const balance = async () => (await pool.query(
  `SELECT balance_minor FROM account WHERE id = 'AC-1'`)).rows[0].balance_minor;
console.log('balance:', await balance());
console.log('retry same request:', await withdraw(winner, 'R-1', 80000, T));
console.log('reverse:', await reverse(winner, 'R-1'),
  'again:', await reverse(winner, 'R-1'), 'balance:', await balance());
console.log('R-2 for 50000:', await withdraw('ATM-1', 'R-2', 50000, T));
console.log('R-3 for 50000:', await withdraw('ATM-1', 'R-3', 50000, T));
await pool.end();
