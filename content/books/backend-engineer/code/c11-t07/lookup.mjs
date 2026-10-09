import mongoose from 'mongoose';
import { seed } from './seed.mjs';

await mongoose.connect(process.env.MONGO_URI);
await seed(mongoose.connection.db);
const loose = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', loose);

const join = {
  $lookup: {
    from: 'customers',
    localField: 'customer',
    foreignField: 'name',
    as: 'who',
  },
};

const big = await Order.aggregate([
  { $match: { total: { $gte: 130 } } },
  join,
  { $project: { _id: 0, customer: 1, total: 1, 'who.tier': 1 } },
  { $sort: { total: 1 } },
]);
console.dir(big, { depth: null });

const byTier = await Order.aggregate([
  { $match: { status: 'paid' } },
  join,
  { $unwind: '$who' },
  { $group: { _id: '$who.tier', revenue: { $sum: '$total' } } },
  { $sort: { _id: 1 } },
]);
console.log(byTier);
await mongoose.disconnect();
