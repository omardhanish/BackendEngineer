test('finds the first long word', () => {
  eq(firstLongWord(['cat', 'banana', 'elephant']), 'banana');
});
test('six letters counts', () => {
  eq(firstLongWord(['moon', 'planet']), 'planet');
});
test('five letters is too short', () => {
  eq(firstLongWord(['moons']), undefined);
});
test('no long word', () => eq(firstLongWord(['a', 'bb', 'ccc']), undefined));
test('empty array', () => eq(firstLongWord([]), undefined));
