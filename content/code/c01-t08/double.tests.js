test('doubles each number', () => eq(doubleAll([1, 2, 3]), [2, 4, 6]));
test('handles zero and negatives', () => {
  eq(doubleAll([-2, 0, 5]), [-4, 0, 10]);
});
test('one number', () => eq(doubleAll([21]), [42]));
test('empty array', () => eq(doubleAll([]), []));
