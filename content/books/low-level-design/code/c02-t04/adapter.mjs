class OldGateway { // vendor code: cents, a result object
  makePayment(cents, currency) {
    return { ok: true, ref: `OG-${cents}-${currency}` };
  }
}
class GatewayAdapter { // the shape our code expects: pay(amount)
  #old;
  constructor(old) { this.#old = old; }
  pay(amount) {
    const res = this.#old.makePayment(Math.round(amount * 100), 'EUR');
    if (!res.ok) throw new Error('payment failed');
    return `receipt ${res.ref}`;
  }
}
const checkout = (gateway, amount) => gateway.pay(amount);
console.log(checkout(new GatewayAdapter(new OldGateway()), 12.5));
