class LineItem {
  constructor(price, qty) { this.price = price; this.qty = qty; }
  subtotal() { return this.price * this.qty; } // Information Expert
}
class Order {
  #lines = [];
  addLine(price, qty) { this.#lines.push(new LineItem(price, qty)); } // Creator
  total() { return this.#lines.reduce((s, l) => s + l.subtotal(), 0); }
}
class OrderController { // Controller: first stop for a system event
  #order = new Order();
  addItem(req) { this.#order.addLine(req.price, req.qty); }
  total() { return this.#order.total(); }
}
const ctl = new OrderController();
ctl.addItem({ price: 4, qty: 2 }); ctl.addItem({ price: 10, qty: 1 });
console.log(ctl.total());
