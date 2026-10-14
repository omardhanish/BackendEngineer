import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE TABLE restaurant (id TEXT PRIMARY KEY, name TEXT NOT NULL,
    dining_minutes INT NOT NULL CHECK (dining_minutes > 0));
  CREATE TABLE customer (id TEXT PRIMARY KEY, name TEXT NOT NULL,
    phone TEXT NOT NULL);
  CREATE TABLE dining_table (id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurant,
    capacity INT NOT NULL CHECK (capacity > 0),
    area TEXT NOT NULL CHECK (area IN ('INDOOR','PATIO')));
  CREATE TABLE reservation (id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurant,
    table_id TEXT NOT NULL REFERENCES dining_table,
    customer_id TEXT NOT NULL REFERENCES customer,
    party_size INT NOT NULL CHECK (party_size > 0),
    slot TSTZRANGE NOT NULL CHECK (NOT isempty(slot)),
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN
      ('CONFIRMED','SEATED','COMPLETED','CANCELLED','NO_SHOW')),
    idempotency_key TEXT NOT NULL UNIQUE,
    CONSTRAINT no_overlap EXCLUDE USING gist
      (table_id WITH =, slot WITH &&)
      WHERE (status IN ('CONFIRMED','SEATED')));
  -- host's evening list: reservations of one restaurant by start time
  CREATE INDEX reservation_by_start
    ON reservation (restaurant_id, lower(slot));
  -- no-show sweeper: only rows still waiting for their party
  CREATE INDEX reservation_waiting ON reservation (lower(slot))
    WHERE status = 'CONFIRMED';
`);

await pool.query(`
  INSERT INTO restaurant VALUES ('RS-1', 'Olive Court', 90);
  INSERT INTO customer VALUES ('C-1', 'Ana', '+44 7700 900001'),
    ('C-2', 'Ben', '+44 7700 900002');
  INSERT INTO dining_table VALUES ('T1','RS-1',2,'INDOOR'),
    ('T2','RS-1',4,'INDOOR'), ('T3','RS-1',4,'INDOOR'),
    ('T4','RS-1',6,'PATIO');
  INSERT INTO reservation (id, restaurant_id, table_id, customer_id,
    party_size, slot, idempotency_key) VALUES ('RV-1', 'RS-1', 'T2',
    'C-1', 3, '[2026-03-06 19:00+00, 2026-03-06 20:30+00)', 'k-1');
`);

const add = (id, table, party, from, to, key, status = 'CONFIRMED') =>
  pool.query(`INSERT INTO reservation VALUES ($1, 'RS-1', $2, 'C-2',
    $3, tstzrange($4, $5), $6, $7)`,
    [id, table, party, from, to, status, key]);
const D = '2026-03-06 ';
const attempts = [
  ['overlap on T2', () => add('RV-2', 'T2', 2, D + '20:00+00',
    D + '21:30+00', 'k-2')],
  ['back-to-back', () => add('RV-3', 'T2', 2, D + '20:30+00',
    D + '22:00+00', 'k-3')],
  ['party of 0', () => add('RV-4', 'T1', 0, D + '18:00+00',
    D + '19:30+00', 'k-4')],
  ['unknown table', () => add('RV-5', 'T9', 2, D + '18:00+00',
    D + '19:30+00', 'k-5')],
  ['same key twice', () => add('RV-6', 'T1', 2, D + '18:00+00',
    D + '19:30+00', 'k-1')],
  ['cancel, rebook', async () => {
    await pool.query(`UPDATE reservation SET status = 'CANCELLED'
      WHERE id = 'RV-1'`);
    return add('RV-7', 'T2', 4, D + '19:00+00', D + '20:30+00', 'k-7');
  }],
];
for (const [label, run] of attempts) {
  try { await run(); console.log(label.padEnd(15), 'ok'); }
  catch (e) { console.log(label.padEnd(15), e.code, e.constraint); }
}
const { rows } = await pool.query(`SELECT id, table_id, status
  FROM reservation ORDER BY id`);
console.log(JSON.stringify(rows));
await pool.end();
