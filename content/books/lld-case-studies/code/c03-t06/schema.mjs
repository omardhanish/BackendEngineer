import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE payment (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    method TEXT NOT NULL CHECK (method IN ('UPI', 'CARD')),
    method_ref TEXT NOT NULL,          -- UPI id or card token, never a PAN
    status TEXT NOT NULL CHECK (status IN ('CREATED', 'PROCESSING',
      'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED')),
    refunded_minor BIGINT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT refund_within_amount
      CHECK (refunded_minor BETWEEN 0 AND amount_minor));
  -- serves: list payments of an order
  CREATE INDEX payment_order_idx ON payment (order_id);
  -- serves: an order is paid at most once
  CREATE UNIQUE INDEX payment_one_success ON payment (order_id)
    WHERE status IN ('SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED');
  -- serves: the reconciler finds stuck PROCESSING rows, oldest first
  CREATE INDEX payment_stuck_idx ON payment (updated_at)
    WHERE status = 'PROCESSING';
  CREATE TABLE refund (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES payment (id),
    idempotency_key TEXT NOT NULL UNIQUE,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    created_at TIMESTAMPTZ NOT NULL);
  CREATE INDEX refund_payment_idx ON refund (payment_id);`);

const T = '2026-01-15 10:00+00';
async function add(id, order, key, amount, status) {
  await pool.query(`INSERT INTO payment (id, order_id, idempotency_key,
    amount_minor, currency, method, method_ref, status, updated_at)
    VALUES ($1, $2, $3, $4, 'INR', 'UPI', 'asha@okbank', $5, $6)`,
    [id, order, key, amount, status, T]);
}
async function attempt(label, fn) {
  try { await fn(); console.log(`${label} -> ok`); }
  catch (e) { console.log(`${label} -> ${e.code} ${e.constraint}`); }
}
await attempt('P-1 for ORD-1', () =>
  add('P-1', 'ORD-1', 'k-1', 49900, 'SUCCEEDED'));
await attempt('P-2 failed try for ORD-2', () =>
  add('P-2', 'ORD-2', 'k-2', 15000, 'FAILED'));
await attempt('P-3 second try for ORD-2', () =>
  add('P-3', 'ORD-2', 'k-3', 15000, 'SUCCEEDED'));
await attempt('same Idempotency-Key', () =>
  add('P-4', 'ORD-4', 'k-1', 100, 'CREATED'));
await attempt('second success for ORD-1', () =>
  add('P-5', 'ORD-1', 'k-5', 49900, 'SUCCEEDED'));
await attempt('zero amount', () =>
  add('P-6', 'ORD-6', 'k-6', 0, 'CREATED'));
await attempt('refund more than paid', () => pool.query(
  `UPDATE payment SET refunded_minor = 50000 WHERE id = 'P-1'`));
await attempt('refund for unknown payment', () => pool.query(
  `INSERT INTO refund VALUES ('R-1', 'P-9', 'r-1', 100, $1)`, [T]));
const { rows } = await pool.query(
  'SELECT id, order_id, status FROM payment ORDER BY id');
console.log(JSON.stringify(rows));
await pool.end();
