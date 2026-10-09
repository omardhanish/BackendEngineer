test('finds the largest', () => eq(largest([3, 9, 4]), 9));
test('largest comes first', () => eq(largest([8, 2, 5]), 8));
test('all negative numbers', () => eq(largest([-5, -2, -9]), -2));
test('zero beats negatives', () => eq(largest([-1, 0, -3]), 0));
test('one item', () => eq(largest([7]), 7));
test('empty array', () => eq(largest([]), undefined));
