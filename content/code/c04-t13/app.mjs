import express from 'express';
import * as Book from './src/models/book.model.js';

Book.create({ title: '<b>Hyperion</b>', author: 'Dan Simmons', year: 1989 });

const app = express();
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('books', { books: Book.findAll() });
});

const server = app.listen(0, async () => {
  const res = await fetch(`http://localhost:${server.address().port}/`);
  console.log(res.status, res.headers.get('content-type'));
  console.log(await res.text());
  server.close();
});
