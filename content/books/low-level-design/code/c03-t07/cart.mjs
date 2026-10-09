class Product {
  constructor(sku, name, cents, stock) {
    Object.assign(this, { sku, name, cents, stock });
  }
}
class Cart {
  #lines = new Map();                 // sku -> { product, qty }
  add(product, qty = 1) {
    const line = this.#lines.get(product.sku) ?? { product, qty: 0 };
    line.qty += qty;
    this.#lines.set(product.sku, line);
  }
  remove(sku) { this.#lines.delete(sku); }
  clear() { this.#lines.clear(); }
  lines() { return [...this.#lines.values()]; }
  subtotal() {
    return this.lines().reduce((s, l) => s + l.product.cents * l.qty, 0);
  }
}
class PercentOff {
  constructor(pct) { this.pct = pct; }
  discount(cart) { return Math.floor((cart.subtotal() * this.pct) / 100); }
}
class Checkout {
  #discounts;
  constructor(discounts) { this.#discounts = discounts; }
  placeOrder(cart) {
    const short = cart.lines().find((l) => l.qty > l.product.stock);
    if (short) throw new Error(`${short.product.name}: out of stock`);
    for (const l of cart.lines()) l.product.stock -= l.qty;
    const off = this.#discounts.reduce((s, d) => s + d.discount(cart), 0);
    const total = cart.subtotal() - off;
    cart.clear();
    return total;
  }
}
const pen = new Product('P1', 'pen', 150, 10);
const mug = new Product('M1', 'mug', 899, 1);
const checkout = new Checkout([new PercentOff(10)]);
const ana = new Cart();
ana.add(pen, 2); ana.add(mug); ana.add(pen);
console.log('subtotal', ana.subtotal(), 'lines', ana.lines().length);
console.log('ana pays', checkout.placeOrder(ana), 'cart now', ana.subtotal());
const raj = new Cart();
raj.add(mug);
try { checkout.placeOrder(raj); } catch (e) { console.log(e.message); }
console.log('pens left', pen.stock, 'mugs left', mug.stock);
