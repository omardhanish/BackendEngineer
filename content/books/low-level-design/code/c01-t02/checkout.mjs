class Percent { constructor(p) { this.p = p; }
  apply(total) { return total * (1 - this.p / 100); } }
class Flat { constructor(off) { this.off = off; }
  apply(total) { return Math.max(0, total - this.off); } }

class Checkout {
  constructor(rules) { this.rules = rules; } // injected, not built here
  total(amount) {
    return this.rules.reduce((sum, rule) => rule.apply(sum), amount);
  }
}
const cart = new Checkout([new Percent(10), new Flat(5)]);
console.log(cart.total(100));
console.log(new Checkout([]).total(100));
