import mongoose from 'mongoose';

const Book = mongoose.model('Book', new mongoose.Schema({
  title: String, author: String, year: Number,
}));
await mongoose.connect(process.env.MONGO_URI);
await Book.insertMany([
  { title: 'Dune', author: 'Frank Herbert', year: 1965 },
  { title: 'Dune Messiah', author: 'Frank Herbert', year: 1969 },
  { title: 'Children of Dune', author: 'Frank Herbert', year: 1976 },
  { title: 'Neuromancer', author: 'William Gibson', year: 1984 },
  { title: 'Count Zero', author: 'William Gibson', year: 1986 },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', year: 1974 },
  { title: 'Emma', author: 'Jane Austen', year: 1815 },
]);

const stages = [
  { $match: { year: { $gte: 1900 } } },
  { $group: { _id: '$author', books: { $sum: 1 } } },
  { $sort: { books: -1 } },
];
console.log('collection:', await Book.countDocuments());
for (let n = 1; n <= stages.length; n++) {
  const docs = await Book.aggregate(stages.slice(0, n));
  console.log('after', Object.keys(stages[n - 1])[0] + ':', docs.length);
}
console.log(await Book.aggregate(stages));
await mongoose.disconnect();
