class Money {
  constructor(amount, currency) {
    this.amount = amount; this.currency = currency;
    Object.freeze(this);
  }
  add(o) {
    if (o.currency !== this.currency) throw new Error('currency mismatch');
    return new Money(this.amount + o.amount, this.currency);
  }
  equals(o) { return o.amount === this.amount && o.currency === this.currency; }
}
const fee = new Money(500, 'GBP');
console.log(fee.add(new Money(250, 'GBP')).amount, fee.amount);
console.log(fee.equals(new Money(500, 'GBP')), fee === new Money(500, 'GBP'));
