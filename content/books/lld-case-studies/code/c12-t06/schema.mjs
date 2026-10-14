import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE TABLE employee (id TEXT PRIMARY KEY, name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE);
  CREATE TABLE room (id TEXT PRIMARY KEY, name TEXT NOT NULL,
    floor INT NOT NULL, capacity INT NOT NULL CHECK (capacity > 0));
  CREATE TABLE booking (id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES room(id),
    organizer_id TEXT NOT NULL REFERENCES employee(id),
    title TEXT NOT NULL, attendees INT NOT NULL CHECK (attendees > 0),
    during TSTZRANGE NOT NULL CHECK (NOT isempty(during) AND
      lower_inc(during) AND NOT upper_inc(during) AND NOT upper_inf(during)),
    status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (status IN
      ('BOOKED','CHECKED_IN','COMPLETED','CANCELLED','RELEASED')),
    version INT NOT NULL DEFAULT 0,
    EXCLUDE USING gist (room_id WITH =, during WITH &&)
      WHERE (status IN ('BOOKED','CHECKED_IN')));
  CREATE INDEX booking_organizer_idx ON booking (organizer_id, during);
  INSERT INTO employee VALUES ('E-1','Asha','asha@corp.test'),
    ('E-2','Ravi','ravi@corp.test');
  INSERT INTO room VALUES ('R-1','Orion',3,4), ('R-2','Vega',3,10),
    ('R-3','Lyra',5,8);`);
const book = (id, room, from, to, status = 'BOOKED') => pool.query(
  `INSERT INTO booking (id, room_id, organizer_id, title, attendees,
     during, status) VALUES ($1, $2, 'E-1', 'Sync', 3,
     tstzrange($3, $4, '[)'), $5)`, [id, room, from, to, status]);
async function tryIt(label, fn) {
  try { await fn(); console.log(label, 'ok'); }
  catch (e) { console.log(label, 'refused', e.code, e.constraint ?? ''); }
}
const d = (hm) => `2026-01-15 ${hm}+00`;
await tryIt('BK-1 R-1 10:00-11:00', () => book('BK-1','R-1',d('10:00'),
  d('11:00')));
await tryIt('BK-2 R-1 10:30-11:30', () => book('BK-2','R-1',d('10:30'),
  d('11:30')));
await tryIt('BK-3 R-1 11:00-12:00', () => book('BK-3','R-1',d('11:00'),
  d('12:00')));
await tryIt('BK-4 R-2 10:30-11:30', () => book('BK-4','R-2',d('10:30'),
  d('11:30')));
await tryIt('BK-5 R-1 cancelled overlap', () => book('BK-5','R-1',
  d('10:15'), d('10:45'), 'CANCELLED'));
await tryIt('BK-6 R-1 ends before start', () => book('BK-6','R-1',
  d('14:00'), d('13:00')));
await tryIt('BK-7 room R-9', () => book('BK-7','R-9',d('09:00'),
  d('09:30')));
await tryIt('BK-8 status LOST', () => book('BK-8','R-3',d('09:00'),
  d('09:30'), 'LOST'));
const free = await pool.query(`SELECT r.id, r.name FROM room r
  WHERE r.capacity >= $1 AND NOT EXISTS (SELECT 1 FROM booking b
    WHERE b.room_id = r.id AND b.status IN ('BOOKED','CHECKED_IN')
      AND b.during && tstzrange($2, $3, '[)'))
  ORDER BY r.capacity, r.id`, [4, d('10:30'), d('11:30')]);
console.log('free for 4 at 10:30-11:30:', JSON.stringify(free.rows));
await pool.end();
