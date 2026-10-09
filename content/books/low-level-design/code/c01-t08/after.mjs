const MEMBER_DISCOUNT = 0.1;

const lineTotal = (item) => item.price * item.quantity;

function orderTotal(items, { isMember = false } = {}) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  const subtotal = items
    .filter((item) => item.quantity > 0)
    .reduce((sum, item) => sum + lineTotal(item), 0);
  return isMember ? subtotal * (1 - MEMBER_DISCOUNT) : subtotal;
}

const items = [
  { price: 20, quantity: 2 },
  { price: 5, quantity: 0 },
  { price: 10, quantity: 1 },
];
console.log(orderTotal(items, { isMember: true }), orderTotal(items));
