import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE doctor (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE patient (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE slot (
    id TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL REFERENCES doctor (id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    fee_minor BIGINT NOT NULL CONSTRAINT fee_not_negative
      CHECK (fee_minor >= 0),
    CONSTRAINT ends_after_start CHECK (ends_at > starts_at),
    CONSTRAINT one_slot_per_start UNIQUE (doctor_id, starts_at));
  CREATE TABLE appointment (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES slot (id),
    patient_id TEXT NOT NULL REFERENCES patient (id),
    status TEXT NOT NULL CONSTRAINT known_status
      CHECK (status IN ('BOOKED', 'CANCELLED', 'COMPLETED')),
    version INT NOT NULL DEFAULT 1);
  -- one live appointment per slot; cancelled rows stay as history
  CREATE UNIQUE INDEX one_live_per_slot ON appointment (slot_id)
    WHERE status = 'BOOKED';
  -- serves "list my appointments" for a patient
  CREATE INDEX appointment_by_patient ON appointment (patient_id);
  INSERT INTO doctor VALUES ('D-1', 'Dr Rao');
  INSERT INTO patient VALUES ('P-1', 'Asha'), ('P-2', 'Ben');
  INSERT INTO slot VALUES ('SL-1', 'D-1', '2026-03-02 09:00+00',
    '2026-03-02 09:30+00', 50000);
  INSERT INTO appointment (id, slot_id, patient_id, status)
    VALUES ('AP-1', 'SL-1', 'P-1', 'BOOKED');`);

async function attempt(label, sql, params = []) {
  try {
    await pool.query(sql, params);
    console.log(label.padEnd(20), 'ok');
  } catch (e) {
    console.log(label.padEnd(20), e.code, e.constraint);
  }
}
const book = `INSERT INTO appointment (id, slot_id, patient_id, status)
  VALUES ($1, 'SL-1', $2, 'BOOKED')`;
await attempt('second live booking', book, ['AP-2', 'P-2']);
await attempt('cancel AP-1', `UPDATE appointment
  SET status = 'CANCELLED' WHERE id = 'AP-1'`);
await attempt('book after cancel', book, ['AP-2', 'P-2']);
await attempt('slot ends first', `INSERT INTO slot VALUES ('SL-2', 'D-1',
  '2026-03-02 10:00+00', '2026-03-02 09:30+00', 50000)`);
await attempt('negative fee', `INSERT INTO slot VALUES ('SL-3', 'D-1',
  '2026-03-02 11:00+00', '2026-03-02 11:30+00', -100)`);
await attempt('unknown doctor', `INSERT INTO slot VALUES ('SL-4', 'D-9',
  '2026-03-02 11:00+00', '2026-03-02 11:30+00', 50000)`);
await attempt('made-up status', `UPDATE appointment
  SET status = 'LOST' WHERE id = 'AP-2'`);

const { rows } = await pool.query(`SELECT id, patient_id, status
  FROM appointment ORDER BY id`);
console.log(JSON.stringify(rows));
await pool.end();
