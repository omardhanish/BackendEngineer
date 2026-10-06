import { MongoClient } from 'mongodb';

const client = await MongoClient.connect(process.env.MONGO_URI);
const books = client.db().collection('books');
await books.insertMany([
  { title: 'Dune', author: 'Frank Herbert', year: 1965 },
  { title: 'Emma', author: 'Jane Austen', tags: ['classic'] },
  { title: 'Neuromancer', author: 'William Gibson', year: 1984,
    edition: { format: 'paperback' } },
]);
const docs = await books.find({}, { projection: { _id: 0 } }).toArray();
docs.forEach((doc) => console.log(JSON.stringify(doc)));
console.log(Object.keys(await books.findOne()));
await client.close();
