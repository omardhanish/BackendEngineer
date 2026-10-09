class Product { constructor(n, c) { this.name = n; this.cents = c; } }
class LineItem {
  constructor(product, qty) { this.product = product; this.qty = qty; }
  total() { return this.product.cents * this.qty; }
}
class Order {
  #items = []; // composition: Order makes and owns each LineItem
  add(product, qty) { this.#items.push(new LineItem(product, qty)); }
  total() { return this.#items.reduce((s, i) => s + i.total(), 0); }
}
const pen = new Product('pen', 150); // association: shared, outlives orders
const order = new Order();
order.add(pen, 2); order.add(pen, 1);
console.log(order.total(), pen.name);
