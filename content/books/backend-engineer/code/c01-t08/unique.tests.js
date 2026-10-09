test('removes duplicates', () => eq(unique([1, 2, 2, 3, 1]), [1, 2, 3]));
test('keeps first-seen order', () => eq(unique([3, 1, 3, 2, 1]), [3, 1, 2]));
test('works on strings', () => eq(unique(['a', 'b', 'a']), ['a', 'b']));
test('1 and "1" differ', () => eq(unique([1, '1', 1]), [1, '1']));
test('no duplicates', () => eq(unique([1, 2, 3]), [1, 2, 3]));
test('empty array', () => eq(unique([]), []));
