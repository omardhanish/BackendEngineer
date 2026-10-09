import mongoose from 'mongoose';
import { seed } from './seed.mjs';

await mongoose.connect(process.env.MONGO_URI);
await seed(mongoose.connection.db);
const loose = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', loose);

const perCustomer = await Order.aggregate([
  { $group: {
    _id: '$customer',
    orders: { $sum: 1 },
    spent: { $sum: '$total' },
    avg: { $avg: '$total' },
    low: { $min: '$total' },
    high: { $max: '$total' },
  } },
  { $sort: { _id: 1 } },
]);
console.log(perCustomer);

const paid = await Order.aggregate([
  { $match: { status: 'paid' } },
  { $count: 'paid' },
]);
console.log(paid);
await mongoose.disconnect();
