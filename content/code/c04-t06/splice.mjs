const books = [{ id: 1 }, { id: 2 }, { id: 3 }];
const i = books.findIndex((b) => b.id === 9);

console.log('index:', i);
books.splice(i, 1);
console.log('left:', books.map((b) => b.id).join(' '));
