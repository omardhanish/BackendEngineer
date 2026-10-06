import * as Book from './book.model.js';

console.log('books:', Book.findAll().length);
Book.create({ title: 'Hyperion', author: 'Dan Simmons', year: 1989 });
console.log('books:', Book.findAll().length);

const copy = Book.findById(1);
copy.title = 'Changed';
console.log('stored title:', Book.findById(1).title);
console.log('Book.books:', Book.books);
console.log('public API:', Object.keys(Book).join(', '));
