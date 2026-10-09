// Domain service: a rule that belongs to no single aggregate
class Wallet {
  #balance;
  constructor(id, balance) { this.id = id; this.#balance = balance; }
  get balance() { return this.#balance; }
  debit(n) {
    if (n > this.#balance) throw new Error(`${this.id}: insufficient funds`);
    this.#balance -= n;
  }
  credit(n) { this.#balance += n; }
}
const transfer = (from, to, n) => { from.debit(n); to.credit(n); };
const a = new Wallet('A', 30), b = new Wallet('B', 0);
transfer(a, b, 20);
try { transfer(a, b, 20); } catch (e) { console.log(e.message); }
console.log(a.balance, b.balance);
