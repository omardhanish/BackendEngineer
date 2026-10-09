class Account {
  constructor(balance) { this.balance = balance; }
  withdraw(n) { this.balance -= n; return this.balance; }
}
class LockedDeposit extends Account {
  withdraw() { throw new Error('locked until maturity'); }
}
function payRent(account) { return account.withdraw(30); }

for (const acc of [new Account(100), new LockedDeposit(100)]) {
  try { console.log(acc.constructor.name, payRent(acc)); }
  catch (e) { console.log(acc.constructor.name, 'failed:', e.message); }
}
