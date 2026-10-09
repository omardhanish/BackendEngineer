class Order { // aggregate root: the only door into its lines
  #lines = []; #events = []; #limit;
  constructor(id, limit) { this.id = id; this.#limit = limit; }
  addLine(sku, price) {
    if (this.total() + price > this.#limit) throw new Error('over limit');
    this.#lines.push({ sku, price });
    this.#events.push({ type: 'LineAdded', orderId: this.id, sku });
  }
  total() { return this.#lines.reduce((s, l) => s + l.price, 0); }
  lineCount() { return this.#lines.length; }
  pullEvents() { const e = this.#events; this.#events = []; return e; }
}
class OrderRepository { // looks like a collection of whole aggregates
  #rows = new Map();
  save(order) { this.#rows.set(order.id, order); }
  byId(id) { return this.#rows.get(id); }
}
const repo = new OrderRepository();
repo.save(new Order('o-1', 100));
const order = repo.byId('o-1');
order.addLine('desk', 70);
try { order.addLine('lamp', 40); } catch (e) { console.log(e.message); }
repo.save(order);
console.log(order.lineCount(), order.total());
const events = order.pullEvents();
console.log(events.map((e) => e.type).join(), order.pullEvents().length);
