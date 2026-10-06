import mongoose from 'mongoose';
import { seed } from './seed.mjs';

await mongoose.connect(process.env.MONGO_URI);
await seed(mongoose.connection.db);
const loose = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', loose);

const lines = await Order.aggregate([
  { $match: { customer: 'Ana' } },
  { $unwind: '$items' },
  { $project: { _id: 0, total: 1, items: 1 } },
  { $sort: { total: -1, 'items.sku': 1 } },
]);
console.log(lines);

const bySku = await Order.aggregate([
  { $unwind: '$items' },
  { $group: {
    _id: '$items.sku',
    units: { $sum: '$items.qty' },
    revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
  } },
  { $sort: { _id: 1 } },
]);
console.log(bySku);

const sizes = await Order.aggregate([
  { $group: {
    _id: '$customer',
    orders: { $sum: 1 },
    lines: { $sum: { $size: '$items' } },
  } },
  { $sort: { _id: 1 } },
]);
console.log(sizes);
await mongoose.disconnect();
