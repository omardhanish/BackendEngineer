import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = (text) => pool.query(text);

await q(`create table books (id serial primary key, title text not null,
  author text not null, year integer)`);
await q(`insert into books (title, author, year) values
  ('Dune', 'Frank Herbert', 1965), ('Neuromancer', 'William Gibson', 1984),
  ('The Dispossessed', 'Ursula K. Le Guin', 1974)`);

await q(`create table authors (id serial primary key,
  name text not null unique)`);
await q(`insert into authors (name)
  select distinct author from books order by author`);
await q(`alter table books
  add column author_id integer references authors(id)`);
await q(`update books set author_id = authors.id
  from authors where authors.name = books.author`);
await q('alter table books drop column author');

await q(`insert into books (title, author_id, year)
  values ('Dune Messiah', 1, 1969)`);
const { rows } = await q(`select books.title, authors.name from books
  join authors on authors.id = books.author_id order by books.id`);
console.log(rows);
await pool.end();
