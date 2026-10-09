class DomainError extends Error {
  constructor(code) { super(code); this.code = code; }
}
class Wallet {
  #cents = 0;
  #requirePositive(n) {
    if (!Number.isInteger(n) || n <= 0) throw new DomainError('BAD_AMOUNT');
  }
  add(n) { this.#requirePositive(n); this.#cents += n; return this.#cents; }
  pay(n) {
    this.#requirePositive(n);
    if (n > this.#cents) throw new DomainError('NO_FUNDS');
    this.#cents -= n;
    return this.#cents;
  }
}
const wallet = new Wallet();
wallet.add(500);
for (const n of [200, '50', 900]) {
  try { console.log('paid, left', wallet.pay(n)); }
  catch (e) { console.log('refused', JSON.stringify(n), e.code); }
}
