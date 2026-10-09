import pg from 'pg';

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await db.query(`create table books (id serial primary key,
  title text not null, author text not null, year integer)`);
try {
  await db.query(`insert into books (title) values ('Emma')`);
} catch (err) {
  console.log(err.code, err.message);
}
await db.end();
