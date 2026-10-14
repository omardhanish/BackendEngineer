import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE payment (id TEXT PRIMARY KEY, amount_minor BIGINT NOT NULL,
    refunded_minor BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL, version INT NOT NULL DEFAULT 0,
    CONSTRAINT refund_within_amount
      CHECK (refunded_minor BETWEEN 0 AND amount_minor));
  CREATE TABLE refund (id TEXT PRIMARY KEY, payment_id TEXT NOT NULL
    REFERENCES payment (id), amount_minor BIGINT NOT NULL);
  INSERT INTO payment (id, amount_minor, status) VALUES
    ('P-1', 50000, 'SUCCEEDED'), ('P-2', 15000, 'PROCESSING');`);

// The critical transaction: lock the payment row, check, then write.
async function refund(paymentId, refundId, amount) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [p] } = await c.query(`SELECT amount_minor,
      refunded_minor, status FROM payment WHERE id = $1 FOR UPDATE`,
      [paymentId]);
    const left = Number(p.amount_minor) - Number(p.refunded_minor);
    if (!['SUCCEEDED', 'PARTIALLY_REFUNDED'].includes(p.status)
        || amount > left) {
      await c.query('ROLLBACK');
      return 'refused';
    }
    await c.query('INSERT INTO refund VALUES ($1, $2, $3)',
      [refundId, paymentId, amount]);
    await c.query(`UPDATE payment SET refunded_minor = refunded_minor + $2,
      status = CASE WHEN refunded_minor + $2 = amount_minor THEN 'REFUNDED'
        ELSE 'PARTIALLY_REFUNDED' END, version = version + 1
      WHERE id = $1`, [paymentId, amount]);
    await c.query('COMMIT');
    return 'ok';
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

// A webhook moves status only from the state it expects (compare-and-set).
async function webhook(paymentId, to) {
  const r = await pool.query(`UPDATE payment SET status = $2,
    version = version + 1 WHERE id = $1 AND status = 'PROCESSING'`,
    [paymentId, to]);
  return r.rowCount;
}

const race = await Promise.all([refund('P-1', 'R-A', 30000),
  refund('P-1', 'R-B', 30000)]);
console.log('parallel refunds accepted:',
  race.filter((r) => r === 'ok').length);
console.log('refund 20000 more:', await refund('P-1', 'R-C', 20000));
console.log('refund 1 more:', await refund('P-1', 'R-D', 1));
console.log('refund a PROCESSING payment:',
  await refund('P-2', 'R-E', 100));
console.log('webhook SUCCEEDED, rows:', await webhook('P-2', 'SUCCEEDED'));
console.log('same webhook again, rows:', await webhook('P-2', 'SUCCEEDED'));
const { rows } = await pool.query(`SELECT id, refunded_minor, status,
  version FROM payment ORDER BY id`);
for (const r of rows)
  console.log(r.id, r.refunded_minor, r.status, 'v' + r.version);
await pool.end();
