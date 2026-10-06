test('joins the arrays', () => {
  eq(flattenOnce([[1, 2], [3], [4, 5]]), [1, 2, 3, 4, 5]);
});
test('empty arrays vanish', () => eq(flattenOnce([[], [1], []]), [1]));
test('plain items stay', () => eq(flattenOnce([1, [2], 3]), [1, 2, 3]));
test('only one level', () => eq(flattenOnce([1, [2, [3]]]), [1, 2, [3]]));
test('empty array', () => eq(flattenOnce([]), []));
