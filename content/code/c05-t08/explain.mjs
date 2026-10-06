import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = (text) => pool.query(text);
const plan = async (text) => {
  const { rows } = await q(`explain (format json) ${text}`);
  const node = rows[0]['QUERY PLAN'][0].Plan;
  return [node['Node Type'], node['Index Name']].filter(Boolean).join(' ');
};

await q(`create table books (id serial primary key, title text not null,
  author text not null, year integer)`);
await q(`insert into books (title, author, year) values
  ('Dune', 'Frank Herbert', 1965), ('Neuromancer', 'William Gibson', 1984),
  ('The Dispossessed', 'Ursula K. Le Guin', 1974)`);
await q(`insert into books (title, author, year)
  select 'Book ' || n, 'Author ' || n, 1900 + n % 100
  from generate_series(1, 20000) n`);
await q('analyze books');

const find = `select * from books where title = 'Dune'`;
const lowered = `select * from books where lower(title) = 'dune'`;
console.log('no index:', await plan(find));
await q('create index books_title_idx on books (title)');
await q('analyze books');
console.log('with index:', await plan(find));
console.log('lower(title):', await plan(lowered));
await pool.end();
