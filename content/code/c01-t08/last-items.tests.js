test('last two', () => eq(lastItems([1, 2, 3, 4], 2), [3, 4]));
test('last one', () => eq(lastItems(['a', 'b', 'c'], 1), ['c']));
test('n is 0', () => eq(lastItems([1, 2, 3], 0), []));
test('n equals the length', () => eq(lastItems([1, 2, 3], 3), [1, 2, 3]));
test('n is larger than the array', () => eq(lastItems([1, 2], 5), [1, 2]));
test('empty array', () => eq(lastItems([], 3), []));
