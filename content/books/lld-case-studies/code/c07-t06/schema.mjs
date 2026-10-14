import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE product (sku TEXT PRIMARY KEY, name TEXT NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0));
  CREATE TABLE inventory (sku TEXT PRIMARY KEY REFERENCES product,
    on_hand INT NOT NULL CHECK (on_hand >= 0),
    reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    CONSTRAINT reserved_le_on_hand CHECK (reserved <= on_hand));
  CREATE TABLE cart (id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'CHECKED_OUT')));
  CREATE UNIQUE INDEX one_active_cart ON cart (user_id)
    WHERE status = 'ACTIVE';
  CREATE TABLE cart_item (cart_id TEXT REFERENCES cart,
    sku TEXT REFERENCES product,
    qty INT NOT NULL CHECK (qty BETWEEN 1 AND 10),
    PRIMARY KEY (cart_id, sku));
  CREATE TABLE orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'PAID',
      'SHIPPED', 'DELIVERED', 'CANCELLED')),
    total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
    idempotency_key TEXT NOT NULL, UNIQUE (user_id, idempotency_key),
    pay_by TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL);
  CREATE INDEX orders_by_user ON orders (user_id, created_at DESC);
  CREATE INDEX orders_unpaid ON orders (pay_by)
    WHERE status = 'PENDING_PAYMENT';
  CREATE TABLE order_item (order_id TEXT REFERENCES orders,
    sku TEXT REFERENCES product, qty INT NOT NULL CHECK (qty > 0),
    unit_price_minor BIGINT NOT NULL, PRIMARY KEY (order_id, sku));
  CREATE TABLE payment (id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    status TEXT NOT NULL CHECK (status IN ('FAILED', 'SUCCEEDED')));
  CREATE UNIQUE INDEX one_success_per_order ON payment (order_id)
    WHERE status = 'SUCCEEDED';`);

await pool.query(`
  INSERT INTO product VALUES ('SKU-MUG', 'Mug', 49900),
    ('SKU-TEE', 'T-shirt', 79900);
  INSERT INTO inventory (sku, on_hand) VALUES ('SKU-MUG', 5), ('SKU-TEE', 1);
  INSERT INTO cart (id, user_id) VALUES ('C-1', 'U-7');
  INSERT INTO cart_item VALUES ('C-1', 'SKU-MUG', 3);
  INSERT INTO orders VALUES ('OR-1', 'U-7', 'PENDING_PAYMENT', 149700,
    'k-1', '2026-01-15 10:15+00', '2026-01-15 10:00+00');
  INSERT INTO order_item VALUES ('OR-1', 'SKU-MUG', 3, 49900);
  INSERT INTO payment VALUES ('PAY-1', 'OR-1', 149700, 'FAILED'),
    ('PAY-2', 'OR-1', 149700, 'SUCCEEDED');`);

const bad = [
  ['second active cart', `INSERT INTO cart (id, user_id)
    VALUES ('C-2', 'U-7')`],
  ['qty 11 in a cart', `INSERT INTO cart_item VALUES ('C-1', 'SKU-TEE', 11)`],
  ['reserve 2 of 1 tee', `UPDATE inventory SET reserved = 2
    WHERE sku = 'SKU-TEE'`],
  ['reused checkout key', `INSERT INTO orders VALUES ('OR-2', 'U-7',
    'PENDING_PAYMENT', 79900, 'k-1', '2026-01-15 10:20+00',
    '2026-01-15 10:05+00')`],
  ['line for no order', `INSERT INTO order_item
    VALUES ('OR-9', 'SKU-TEE', 1, 79900)`],
  ['second success', `INSERT INTO payment
    VALUES ('PAY-3', 'OR-1', 149700, 'SUCCEEDED')`],
];
for (const [label, sql] of bad) {
  try {
    await pool.query(sql);
    console.log(label.padEnd(20), 'accepted?!');
  } catch (e) {
    console.log(label.padEnd(20), e.code, e.constraint);
  }
}
await pool.end();
