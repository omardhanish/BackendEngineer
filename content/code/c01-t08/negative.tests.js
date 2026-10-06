test('one negative is enough', () => eq(hasNegative([3, -1, 5]), true));
test('all negative', () => eq(hasNegative([-7]), true));
test('zero is not negative', () => eq(hasNegative([0, 1, 2]), false));
test('empty array', () => eq(hasNegative([]), false));
