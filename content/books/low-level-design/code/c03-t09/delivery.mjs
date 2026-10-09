const FLOW = ['PLACED', 'ACCEPTED', 'PREPARING', 'PICKED_UP', 'DELIVERED'];
class Order {
  #step = 0; #watchers = [];
  constructor(id, items) { this.id = id; this.items = items; }
  get status() { return FLOW[this.#step]; }
  subscribe(fn) { this.#watchers.push(fn); }
  advance() {
    if (this.#step === FLOW.length - 1) throw new Error(`${this.id} is done`);
    this.#step += 1;
    for (const fn of this.#watchers) fn(this);
  }
}
class AgentPool {
  #free;
  constructor(names) { this.#free = [...names]; }
  assign() { return this.#free.shift() ?? null; }
  release(name) { this.#free.push(name); }
}
class Dispatcher {                          // observer: reacts to status
  constructor(pool) { this.pool = pool; this.agentOf = new Map(); }
  onChange = (order) => {
    if (order.status === 'PREPARING')
      { const a = this.pool.assign(); if (a) this.agentOf.set(order.id, a); }
    if (order.status === 'DELIVERED')
      { const a = this.agentOf.get(order.id); if (a) this.pool.release(a); }
  };
}
const dispatcher = new Dispatcher(new AgentPool(['Kim']));
const order = new Order('O7', ['dosa', 'chai']);
order.subscribe((o) => console.log('customer sees', o.status));
order.subscribe(dispatcher.onChange);
order.advance(); order.advance();
console.log('agent', dispatcher.agentOf.get('O7'));
order.advance(); order.advance();
try { order.advance(); } catch (e) { console.log(e.message); }
console.log('free again', dispatcher.pool.assign());
