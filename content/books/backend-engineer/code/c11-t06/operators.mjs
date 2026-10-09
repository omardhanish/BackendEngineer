import mongoose from 'mongoose';
import { seed } from './seed.mjs';

await mongoose.connect(process.env.MONGO_URI);
await seed(mongoose.connection.db);
const loose = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', loose);

async function count(filter) {
  const rows = await Order.aggregate([{ $match: filter }, { $count: 'n' }]);
  return rows.length ? rows[0].n : 0;
}

const filters = {
  gt: { total: { $gt: 100 } },
  in: { status: { $in: ['pending', 'cancelled'] } },
  or: { $or: [{ city: 'Faro' }, { total: { $lt: 40 } }] },
  exists: { discount: { $exists: true } },
  regex: { customer: { $regex: '^[AB]' } },
  expr: { $expr: { $gt: [{ $size: '$items' }, 1] } },
};
for (const [name, filter] of Object.entries(filters)) {
  console.log(name, await count(filter));
}

const picks = await Order.aggregate([
  { $match: {
    status: { $in: ['paid', 'pending'] },
    total: { $gte: 50 },
    $or: [{ city: 'Faro' }, { customer: 'Ben' }],
  } },
  { $project: { _id: 0, customer: 1, total: 1 } },
  { $sort: { total: 1 } },
]);
console.log(picks);
await mongoose.disconnect();
