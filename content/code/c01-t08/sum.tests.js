test('adds the numbers', () => eq(sum([1, 2, 3, 4]), 10));
test('one number', () => eq(sum([7]), 7));
test('negatives cancel out', () => eq(sum([-5, 5]), 0));
test('decimals', () => eq(sum([2.5, 0.5]), 3));
test('empty array is 0', () => eq(sum([]), 0));
