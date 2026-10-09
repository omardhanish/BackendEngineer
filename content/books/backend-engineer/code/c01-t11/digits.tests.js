test('0 has one digit', () => eq(countDigits(0), 1));
test('7 has one digit', () => eq(countDigits(7), 1));
test('10 has two digits', () => eq(countDigits(10), 2));
test('999 has three digits', () => eq(countDigits(999), 3));
test('1000 has four digits', () => eq(countDigits(1000), 4));
test('12345 has five digits', () => eq(countDigits(12345), 5));
