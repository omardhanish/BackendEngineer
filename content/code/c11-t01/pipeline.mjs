import mongoose from 'mongoose';
import { seed } from './seed.mjs';

await mongoose.connect(process.env.MONGO_URI);
await seed(mongoose.connection.db);
const loose = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', loose);

const rows = await Order.aggregate([
  { $match: { status: 'paid' } },
  { $group: { _id: '$city', revenue: { $sum: '$total' } } },
  { $sort: { _id: 1 } },
]);
console.log(rows);
await mongoose.disconnect();
