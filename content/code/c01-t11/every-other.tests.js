test('odd length', () => {
  eq(everyOther(['a', 'b', 'c', 'd', 'e']), ['a', 'c', 'e']);
});
test('even length', () => eq(everyOther(['a', 'b', 'c', 'd']), ['a', 'c']));
test('two numbers', () => eq(everyOther([1, 2]), [1]));
test('one item', () => eq(everyOther(['x']), ['x']));
test('empty array', () => eq(everyOther([]), []));
