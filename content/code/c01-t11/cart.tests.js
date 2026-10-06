test('two items', () => {
  eq(cartTotal([{ price: 5, qty: 2 }, { price: 3, qty: 1 }]), 13);
});
test('one item, quantity 3', () => eq(cartTotal([{ price: 4, qty: 3 }]), 12));
test('quantity 0 adds nothing', () => {
  eq(cartTotal([{ price: 9, qty: 0 }, { price: 2, qty: 5 }]), 10);
});
test('a free item', () => eq(cartTotal([{ price: 0, qty: 4 }]), 0));
test('empty cart', () => eq(cartTotal([]), 0));
