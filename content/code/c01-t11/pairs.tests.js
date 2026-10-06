test('three items', () => eq(pairs([1, 2, 3]), [[1, 2], [1, 3], [2, 3]]));
test('four items', () => {
  eq(pairs([1, 2, 3, 4]), [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]);
});
test('two strings', () => eq(pairs(['a', 'b']), [['a', 'b']]));
test('equal values still pair', () => eq(pairs([1, 1]), [[1, 1]]));
test('one item has no pair', () => eq(pairs([1]), []));
test('empty array', () => eq(pairs([]), []));
