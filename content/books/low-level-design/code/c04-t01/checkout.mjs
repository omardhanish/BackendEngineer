class Cart {
  #items = [];
  add(name, price, qty) { this.#items.push({ name, price, qty }); }
  total() {
    return this.#items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
}
class Checkout {
  constructor(payments) { this.payments = payments; }
  pay(cart) { return this.payments.charge(cart.total()); }
}
const fakePayments = { charge: (amount) => `charged ${amount}` };
const cart = new Cart(); cart.add('pen', 3, 2); cart.add('ink', 5, 1);
console.log(new Checkout(fakePayments).pay(cart));
