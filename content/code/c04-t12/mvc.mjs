// Model: data, no HTTP
const books = [{ id: 1, title: 'Dune', year: 1965 }];
const findById = (id) => books.find((b) => b.id === id);
// Views: two ways to show a book (real HTML must escape the title)
const asJson = (book) => JSON.stringify(book);
const asHtml = (book) => `<h1>${book.title}</h1>`;
// Controller: ask the model, pick the view
const show = (id, view) => {
  const book = findById(id);
  return book ? `200 ${view(book)}` : '404 not found';
};
console.log(show(1, asJson));
console.log(show(1, asHtml));
console.log(show(9, asJson));
