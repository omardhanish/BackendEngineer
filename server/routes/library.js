// The library endpoints, and the mounting of the per-book routes:
//   GET  /api/books                       the books with this reader's progress in each
//   *    /api/books/:book/<route>         everything about ONE book (pages, chats, notes, progress, tutor)
//   *    /api/<route>                     the original single-book URLs: they mean the default book
import express from 'express';

const unknownBook = (res) => res.status(404).json({ error: { code: 'unknown_book', message: 'Unknown book.' } });

export function libraryRoutes(api, ctx, bookRouter) {
  const { library } = ctx;

  // a book-less request can only be answered if there is a book
  const guarded = express.Router();
  guarded.use((req, res, next) => (req.bk ? next() : unknownBook(res)));
  guarded.use(bookRouter);

  api.get('/books', async (req, res) => {
    res.json({ default: await library.defaultSlug(), books: await library.list() });
  });

  api.use('/books/:book', async (req, res, next) => {
    req.bk = await library.get(req.params.book); // Map lookup: the slug never becomes a path by itself
    next();
  }, guarded);

  api.use(async (req, res, next) => {
    // exactly the configured default book: if it is missing the old URLs answer 404 rather than writing into another book
    req.bk = await library.get(ctx.config.defaultBook);
    next();
  }, guarded);
}
