/** @interface */
class PaymentGateway {
  charge(cents) { throw new Error('not implemented'); }
}
class FakeGateway extends PaymentGateway {
  charge(cents) { return { ok: cents > 0 }; }
}
class Checkout {
  #gateway;
  constructor(gateway) { this.#gateway = gateway; } // depends on the interface
  pay(cents) { return this.#gateway.charge(cents).ok ? 'paid' : 'declined'; }
}
const checkout = new Checkout(new FakeGateway());
console.log(checkout.pay(1200), checkout.pay(0));
