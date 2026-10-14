import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE inventory (sku TEXT PRIMARY KEY, on_hand INT NOT NULL,
    reserved INT NOT NULL DEFAULT 0, CHECK (reserved <= on_hand));
  CREATE TABLE orders (id TEXT PRIMARY KEY, status TEXT NOT NULL,
    pay_by TIMESTAMPTZ NOT NULL);
  CREATE TABLE order_item (order_id TEXT REFERENCES orders, sku TEXT,
    qty INT NOT NULL, PRIMARY KEY (order_id, sku));
  INSERT INTO inventory (sku, on_hand) VALUES ('SKU-MUG', 5), ('SKU-TEE', 1);`);

const bySku = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);
// The critical query: a conditional UPDATE checks and reserves in one step.
async function placeOrder(id, lines, now) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const [sku, qty] of [...lines].sort(bySku)) {  // fixed SKU order
      const r = await c.query(`UPDATE inventory SET reserved = reserved + $2
        WHERE sku = $1 AND on_hand - reserved >= $2`, [sku, qty]);
      if (r.rowCount === 0) {
        await c.query('ROLLBACK');                  // undo earlier lines
        return `OUT_OF_STOCK ${sku}`;
      }
    }
    await c.query(`INSERT INTO orders VALUES ($1, 'PENDING_PAYMENT',
      $2::timestamptz + interval '15 minutes')`, [id, now]);
    for (const [sku, qty] of lines)
      await c.query('INSERT INTO order_item VALUES ($1, $2, $3)',
        [id, sku, qty]);
    await c.query('COMMIT');
    return 'placed';
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

const stock = async () => JSON.stringify((await pool.query(
  'SELECT sku, on_hand, reserved FROM inventory ORDER BY sku')).rows);
const T0 = '2026-01-15 10:00+00';
const race = await Promise.all([
  placeOrder('OR-1', [['SKU-TEE', 1]], T0),
  placeOrder('OR-2', [['SKU-TEE', 1]], T0),
]);
console.log('race results:', race.sort());
console.log('OR-3:', await placeOrder('OR-3',
  [['SKU-MUG', 2], ['SKU-TEE', 1]], T0));
console.log('OR-4:', await placeOrder('OR-4', [['SKU-MUG', 2]], T0));
console.log(await stock());

const sweep = await pool.query(`WITH expired AS (
    UPDATE orders SET status = 'CANCELLED'
    WHERE status = 'PENDING_PAYMENT' AND pay_by <= $1 RETURNING id)
  UPDATE inventory i SET reserved = i.reserved - s.qty
  FROM (SELECT sku, sum(qty)::int AS qty FROM order_item
        WHERE order_id IN (SELECT id FROM expired) GROUP BY sku) s
  WHERE i.sku = s.sku`, ['2026-01-15 10:16+00']);
console.log('sweep updated inventory rows:', sweep.rowCount, await stock());
const pay = await pool.query(`UPDATE orders SET status = 'PAID'
  WHERE id = 'OR-4' AND status = 'PENDING_PAYMENT'
    AND pay_by > '2026-01-15 10:14+00'`);
console.log('on-time payment for cancelled OR-4:', pay.rowCount);
await pool.end();
