test('keeps the true keys', () => {
  eq(enabledFlags({ dark: true, beta: false, ads: true }), ['dark', 'ads']);
});
test('keeps object order', () => {
  eq(enabledFlags({ b: true, a: true }), ['b', 'a']);
});
test('all false gives none', () => {
  eq(enabledFlags({ a: false, b: false }), []);
});
test('only exactly true counts', () => {
  eq(enabledFlags({ a: 1, b: true }), ['b']);
});
test('one key', () => eq(enabledFlags({ x: true }), ['x']));
test('empty object', () => eq(enabledFlags({}), []));
