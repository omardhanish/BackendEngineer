test('reverses abc', () => eq(reverseText('abc'), 'cba'));
test('keeps capitals and dots', () => eq(reverseText('Node.js'), 'sj.edoN'));
test('keeps spaces', () => eq(reverseText('ab cd'), 'dc ba'));
test('one character', () => eq(reverseText('a'), 'a'));
test('empty text', () => eq(reverseText(''), ''));
