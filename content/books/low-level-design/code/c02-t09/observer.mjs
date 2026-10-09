class OrderEvents {
  #listeners = new Set();
  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn); // the unsubscribe handle
  }
  publish(order) {
    for (const fn of this.#listeners) fn(order);
  }
}
const events = new OrderEvents();
events.subscribe((o) => console.log(`email: order ${o.id} placed`));
const stop = events.subscribe((o) => console.log(`stock: minus ${o.qty}`));
events.publish({ id: 7, qty: 2 });
stop();
events.publish({ id: 8, qty: 1 });
