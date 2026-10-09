import * as Book from '../models/book.model.js';

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isValid = (b) =>
  isText(b?.title) && isText(b?.author) && Number.isInteger(b?.year);
const fail = (res, code, error) => res.status(code).json({ error });
const notFound = (res) => fail(res, 404, 'Book not found');
const badBody = (res) => fail(res, 400, 'Send title, author and year');

export const listBooks = (req, res) => res.json(Book.findAll());

export function getBook(req, res) {
  const book = Book.findById(Number(req.params.id));
  if (!book) return notFound(res);
  res.json(book);
}

export function createBook(req, res) {
  if (!isValid(req.body)) return badBody(res);
  const book = Book.create(req.body);
  res.status(201).location(`/books/${book.id}`).json(book);
}

export function updateBook(req, res) {
  const id = Number(req.params.id);
  if (!Book.findById(id)) return notFound(res);
  if (!isValid(req.body)) return badBody(res);
  res.json(Book.update(id, req.body));
}

export function deleteBook(req, res) {
  if (!Book.remove(Number(req.params.id))) return notFound(res);
  res.status(204).end();
}
