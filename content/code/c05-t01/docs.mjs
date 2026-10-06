import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI);
const books = mongoose.connection.db.collection('books');
await books.insertOne({ title: 'Emma' });
await books.insertOne({ title: 'Dune', author: 'Frank Herbert', year: 1965 });
const docs = await books.find({}, { projection: { _id: 0 } }).toArray();
console.log(docs);
await mongoose.disconnect();
