test('sums 1 to 4', () => eq(sumTo(4), 10));
test('sums 1 to 1', () => eq(sumTo(1), 1));
test('sums 1 to 100', () => eq(sumTo(100), 5050));
test('zero gives 0', () => eq(sumTo(0), 0));
test('negative gives 0', () => eq(sumTo(-3), 0));
