// After: same output, small named pieces
const BOOK_DISCOUNT = 0.1;
const rules = { book: (t) => t * (1 - BOOK_DISCOUNT), food: (t) => t - 1 };
const keep = (t) => t;                 // old code left other types alone
const subtotal = (item) => item.price * item.qty;
function invoiceLine(item) {
  const rule = rules[item.type] ?? keep;
  return `${item.name}: ${rule(subtotal(item)).toFixed(2)}`;
}
const items = [{ name: 'Novel', type: 'book', price: 10, qty: 2 },
  { name: 'Tea', type: 'food', price: 4, qty: 3 },
  { name: 'Pen', type: 'misc', price: 3, qty: 1 }];
for (const it of items) console.log(invoiceLine(it));
