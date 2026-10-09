// Amounts are whole cents, so no floating-point drift.
class EqualSplit {
  shares(total, users) {
    const base = Math.floor(total / users.length);
    const extra = total - base * users.length;   // leftover cents
    return users.map((u, i) => [u, base + (i < extra ? 1 : 0)]);
  }
}
class ExactSplit {
  constructor(amounts) { this.amounts = amounts; }
  shares(total, users) {
    const sum = users.reduce((s, u) => s + this.amounts[u], 0);
    if (sum !== total) throw new Error(`shares add to ${sum}, not ${total}`);
    return users.map((u) => [u, this.amounts[u]]);
  }
}
class Ledger {
  #net = new Map();   // positive: is owed money; negative: owes money
  addExpense(payer, total, users, split) {
    const shares = split.shares(total, users);   // validate before any change
    for (const [u, share] of shares) {
      this.#add(u, -share);
      this.#add(payer, share);
    }
  }
  #add(user, amount) {
    this.#net.set(user, (this.#net.get(user) ?? 0) + amount);
  }
  balances() { return Object.fromEntries(this.#net); }
}
const ledger = new Ledger();
ledger.addExpense('ana', 1000, ['ana', 'ben', 'cy'], new EqualSplit());
const taxi = new ExactSplit({ ana: 300, cy: 600 });
ledger.addExpense('ben', 900, ['ana', 'cy'], taxi);
const wrong = new ExactSplit({ ana: 100, ben: 100 });
try {
  ledger.addExpense('cy', 500, ['ana', 'ben'], wrong);
} catch (e) { console.log('rejected:', e.message); }
console.log(ledger.balances());
