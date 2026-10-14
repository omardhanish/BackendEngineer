import express from 'express';
import pg from 'pg';
import { z } from 'zod';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const hash = (pin, salt) => scryptSync(pin, salt, 32);
const salt = randomBytes(16);          // per card; only the hash is stored
await pool.query(`CREATE TABLE card (token TEXT PRIMARY KEY,
    account_id TEXT NOT NULL, pin_salt BYTEA NOT NULL,
    pin_hash BYTEA NOT NULL, failed_pins INT NOT NULL DEFAULT 0);
  CREATE TABLE atm_session (id SERIAL PRIMARY KEY, account_id TEXT);`);
await pool.query(`INSERT INTO card VALUES ('tok-4444', 'AC-1', $1, $2)`,
  [salt, hash('1234', salt)]);

class AppError extends Error { constructor(s, m) { super(m); this.status=s } }
async function login(token, pin) {      // service: one transaction
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const card = (await c.query(`SELECT * FROM card WHERE token = $1
      FOR UPDATE`, [token])).rows[0];   // two ATMs, one card: serialise
    if (!card || card.failed_pins >= 3) throw new AppError(403, 'CARD_BLOCKED');
    let out;
    if (timingSafeEqual(hash(pin, card.pin_salt), card.pin_hash)) {
      await c.query('UPDATE card SET failed_pins = 0 WHERE token = $1',
        [token]);
      const s = await c.query(`INSERT INTO atm_session (account_id)
        VALUES ($1) RETURNING id`, [card.account_id]);
      out = { sessionId: `S-${s.rows[0].id}` };
    } else {
      await c.query(`UPDATE card SET failed_pins = failed_pins + 1
        WHERE token = $1`, [token]);   // committed even though it fails
      out = { error: 'WRONG_PIN', attemptsLeft: 2 - card.failed_pins };
    }
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

const Login = z.object({ cardToken: z.string(), pin: z.string()
  .regex(/^\d{4}$/) });
const app = express().use(express.json());
app.post('/sessions', async (req, res) => {
  const { cardToken, pin } = Login.parse(req.body);
  const out = await login(cardToken, pin);
  res.status(out.sessionId ? 201 : 401).json(out);
});
app.use((err, req, res, next) => {
  const [status, error] = err instanceof z.ZodError ? [400, 'VALIDATION']
    : err instanceof AppError ? [err.status, err.message] : [500, 'INTERNAL'];
  res.status(status).json({ error });
});
const srv = app.listen(0), base = `http://localhost:${srv.address().port}`;
for (const pin of ['12a4', '0000', '1234', '9999', '9999', '9999', '1234']) {
  const r = await fetch(`${base}/sessions`, { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cardToken: 'tok-4444', pin }) });
  console.log(pin, r.status, JSON.stringify(await r.json()));
}
srv.close(); await pool.end();
