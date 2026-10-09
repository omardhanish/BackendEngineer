// Shared dataset for the MongoDB aggregation chapter. Copy this file into your page folder as seed.mjs.
// Totals equal the sum of qty * price, so every aggregation result can be checked by hand.
export const orders = [
  { customer: 'Ana', status: 'paid', city: 'Lisbon', total: 120, items: [{ sku: 'pen', qty: 4, price: 5 }, { sku: 'book', qty: 2, price: 50 }] },
  { customer: 'Ben', status: 'paid', city: 'Porto', total: 50, items: [{ sku: 'book', qty: 1, price: 50 }] },
  { customer: 'Ana', status: 'paid', city: 'Lisbon', total: 80, items: [{ sku: 'lamp', qty: 1, price: 30 }, { sku: 'pen', qty: 10, price: 5 }] },
  { customer: 'Cleo', status: 'pending', city: 'Porto', total: 60, items: [{ sku: 'lamp', qty: 2, price: 30 }] },
  { customer: 'Dev', status: 'cancelled', city: 'Lisbon', total: 150, items: [{ sku: 'book', qty: 3, price: 50 }] },
  { customer: 'Ben', status: 'paid', city: 'Porto', total: 40, items: [{ sku: 'pen', qty: 2, price: 5 }, { sku: 'lamp', qty: 1, price: 30 }] },
  { customer: 'Eli', status: 'paid', city: 'Faro', total: 130, items: [{ sku: 'book', qty: 2, price: 50 }, { sku: 'lamp', qty: 1, price: 30 }] },
  { customer: 'Cleo', status: 'paid', city: 'Porto', total: 25, items: [{ sku: 'pen', qty: 5, price: 5 }] },
];

export const customers = [
  { name: 'Ana', tier: 'gold' },
  { name: 'Ben', tier: 'silver' },
  { name: 'Cleo', tier: 'silver' },
  { name: 'Dev', tier: 'bronze' },
  { name: 'Eli', tier: 'gold' },
];

/** Fresh copies each time, because insertMany adds an _id to the objects it receives. */
export async function seed(db) {
  await db.collection('orders').insertMany(orders.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) })));
  await db.collection('customers').insertMany(customers.map((c) => ({ ...c })));
}
