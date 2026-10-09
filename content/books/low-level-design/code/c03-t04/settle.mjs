// Turn net balances into the short list of payments (greedy).
function settle(balances) {
  const people = Object.entries(balances).map(([name, net]) => ({ name, net }));
  const payments = [];
  for (;;) {
    people.sort((a, b) => a.net - b.net || a.name.localeCompare(b.name));
    const debtor = people[0], creditor = people[people.length - 1];
    if (debtor.net === 0 || creditor.net === 0) break;
    const amount = Math.min(-debtor.net, creditor.net);
    payments.push(`${debtor.name} pays ${creditor.name} ${amount}`);
    debtor.net += amount;
    creditor.net -= amount;
  }
  return payments;
}
const net = { ana: 400, ben: 200, cy: -350, dev: -250 };
console.log(settle(net).join('\n'));
