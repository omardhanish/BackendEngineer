test('every item is allowed', () => {
  eq(onlyAllowed(['read'], ['read', 'write']), true);
});
test('one item is not allowed', () => {
  eq(onlyAllowed(['read', 'delete'], ['read', 'write']), false);
});
test('nothing to check is true', () => eq(onlyAllowed([], ['read']), true));
test('empty allowed list', () => eq(onlyAllowed(['read'], []), false));
test('repeated items', () => eq(onlyAllowed(['a', 'a'], ['a']), true));
