test('sorts small numbers', () => eq(sortAscending([3, 1, 2]), [1, 2, 3]));
test('compares numbers, not text', () => {
  eq(sortAscending([10, 9, 1, 100]), [1, 9, 10, 100]);
});
test('negative numbers', () => {
  eq(sortAscending([3, -1, -10, 2]), [-10, -1, 2, 3]);
});
test('duplicates stay', () => eq(sortAscending([2, 1, 2]), [1, 2, 2]));
test('empty array', () => eq(sortAscending([]), []));
test('does not change the original', () => {
  const nums = [3, 1, 2];
  sortAscending(nums);
  eq(nums, [3, 1, 2]);
});
