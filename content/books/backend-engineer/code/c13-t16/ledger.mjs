const events = [
  { type: 'Opened' },
  { type: 'Deposited', amount: 100 },
  { type: 'Withdrew', amount: 30 },
  { type: 'Deposited', amount: 50 },
];
const apply = (balance, e) =>
  e.type === 'Deposited' ? balance + e.amount
  : e.type === 'Withdrew' ? balance - e.amount
  : balance;
console.log('now:', events.reduce(apply, 0));
console.log('after 3 events:', events.slice(0, 3).reduce(apply, 0));
