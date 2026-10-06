test('keeps the evens', () => eq(keepEvens([1, 2, 3, 4]), [2, 4]));
test('zero is even', () => eq(keepEvens([0, 1]), [0]));
test('negative numbers', () => eq(keepEvens([-4, -3, 7]), [-4]));
test('no evens', () => eq(keepEvens([1, 3, 5]), []));
test('empty array', () => eq(keepEvens([]), []));
