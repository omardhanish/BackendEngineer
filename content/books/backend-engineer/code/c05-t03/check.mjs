import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query('show server_version_num');
console.log('major version', Math.floor(rows[0].server_version_num / 10000));
await pool.end();
