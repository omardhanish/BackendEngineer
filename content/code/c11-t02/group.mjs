import mongoose from 'mongoose';
import { seed } from './seed.mjs';

await mongoose.connect(process.env.MONGO_URI);
await seed(mongoose.connection.db);
const loose = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', loose);

const byCity = await Order.aggregate([
  { $group: { _id: '$city', revenue: { $sum: '$total' } } },
  { $sort: { _id: 1 } },
]);
console.log(byCity);

const all = await Order.aggregate([
  { $group: { _id: null, revenue: { $sum: '$total' } } },
]);
console.log(all);

const key = { city: '$city', status: '$status' };
const pairs = await Order.aggregate([
  { $group: { _id: key, revenue: { $sum: '$total' } } },
  { $sort: { '_id.city': 1, '_id.status': 1 } },
]);
console.log(pairs);
await mongoose.disconnect();
