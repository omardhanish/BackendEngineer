class Order {
  constructor(p) { Object.assign(this, p); Object.freeze(this); }
}
class OrderBuilder {
  #p = { items: [], express: false };
  customer(name) { this.#p.customer = name; return this; }
  add(item) { this.#p.items.push(item); return this; }
  express() { this.#p.express = true; return this; }
  build() {
    if (!this.#p.customer) throw new Error('customer is required');
    return new Order({ ...this.#p, items: Object.freeze([...this.#p.items]) });
  }
}
const order = new OrderBuilder()
  .customer('ada').add('tea').add('cake').express().build();
console.log(JSON.stringify(order), Object.isFrozen(order));
try { new OrderBuilder().add('tea').build(); }
catch (e) { console.log(e.message); }
