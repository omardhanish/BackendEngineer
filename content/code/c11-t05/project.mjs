import mongoose from 'mongoose';
import { seed } from './seed.mjs';

await mongoose.connect(process.env.MONGO_URI);
await seed(mongoose.connection.db);
const loose = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', loose);

const porto = await Order.aggregate([
  { $match: { status: 'paid', city: 'Porto' } },
  { $project: {
    _id: 0,
    name: '$customer',
    total: 1,
    lines: { $size: '$items' },
  } },
  { $sort: { total: -1 } },
]);
console.log(porto);

const eli = await Order.aggregate([
  { $match: { customer: 'Eli' } },
  { $project: { _id: 0, items: 0 } },
]);
console.log(eli);
await mongoose.disconnect();
