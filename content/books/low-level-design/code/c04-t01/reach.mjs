// Tight: the label code knows the inner shape of an order
const raw = { customer: { address: { city: 'Leeds' } } };
const tightLabel = (o) => `Ship to ${o.customer.address.city}`;

// Loose: ask the object; only Order knows where the city lives
class Order {
  #customer;
  constructor(customer) { this.#customer = customer; }
  shipCity() { return this.#customer.address.city; }
}
const looseLabel = (o) => `Ship to ${o.shipCity()}`;
console.log(tightLabel(raw));
console.log(looseLabel(new Order(raw.customer)));
