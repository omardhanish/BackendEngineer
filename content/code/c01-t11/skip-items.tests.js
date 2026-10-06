test('adds plain numbers', () => eq(sumNumbers([1, 2, 3]), 6));
test('skips text and null', () => eq(sumNumbers([1, '2', null, 3]), 4));
test('skips undefined, keeps negatives', () => {
  eq(sumNumbers([10, undefined, -4]), 6);
});
test('skips booleans', () => eq(sumNumbers([true, 5]), 5));
test('no numbers gives 0', () => eq(sumNumbers(['a', 'b']), 0));
test('empty array', () => eq(sumNumbers([]), 0));
