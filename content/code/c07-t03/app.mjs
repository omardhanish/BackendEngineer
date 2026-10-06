import mongoose from 'mongoose';

const Book = mongoose.model('Book', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true },
  year: { type: Number, required: true },
}));

await mongoose.connect(process.env.MONGO_URI);
await Book.create({ title: ' Dune ', author: 'Frank Herbert', year: '1965' });

try {
  await Book.create({ title: 'Untitled', year: 'soon' });
} catch (err) {
  console.log(err.name);
  for (const [path, e] of Object.entries(err.errors)) {
    console.log(path, e.name);
  }
}
console.log(await Book.find().select('-_id -__v').lean());
await mongoose.disconnect();
