// Before: one function computes, applies rules and formats
function invoiceLine(item) {
  let total = item.price * item.qty;
  if (item.type === 'book') total = total * 0.9;
  else if (item.type === 'food') total = total - 1;
  return item.name + ': ' + total.toFixed(2);
}
const items = [{ name: 'Novel', type: 'book', price: 10, qty: 2 },
  { name: 'Tea', type: 'food', price: 4, qty: 3 },
  { name: 'Pen', type: 'misc', price: 3, qty: 1 }];
for (const it of items) console.log(invoiceLine(it));
