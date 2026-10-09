const books = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965 },
  { id: 2, title: 'Neuromancer', author: 'William Gibson', year: 1984 },
  { id: 3, title: 'The Dispossessed', author: 'Ursula K. Le Guin', year: 1974 },
];
let nextId = 4;

export const findAll = () => books.map((book) => ({ ...book }));

export function findById(id) {
  const book = books.find((b) => b.id === id);
  return book && { ...book };
}

export function create({ title, author, year }) {
  const book = { id: nextId++, title, author, year };
  books.push(book);
  return { ...book };
}

export function update(id, { title, author, year }) {
  const i = books.findIndex((b) => b.id === id);
  if (i < 0) return undefined;
  books[i] = { id, title, author, year };
  return { ...books[i] };
}

export function remove(id) {
  const i = books.findIndex((b) => b.id === id);
  if (i < 0) return false;
  books.splice(i, 1);
  return true;
}
