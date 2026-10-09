// Stored once, in the newest shape: name split, money in cents.
const order = { id: 42, customer: { first: 'Ada', last: 'King' },
  totalCents: 1250, currency: 'GBP' };

const presenters = {
  v1: (o) => ({ id: o.id, customer: `${o.customer.first} ${o.customer.last}`,
    total: o.totalCents / 100 }),
  v2: (o) => ({ id: o.id, customer: o.customer,
    total: { cents: o.totalCents, currency: o.currency } }),
};
function getOrder(version) {
  const present = presenters[version];
  if (!present) return { status: 400, error: `unknown version ${version}` };
  return { status: 200, body: present(order) };
}
for (const v of ['v1', 'v2', 'v3']) console.log(v, JSON.stringify(getOrder(v)));
