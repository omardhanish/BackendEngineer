test('95 is an A', () => eq(grade(95), 'A'));
test('90 is an A', () => eq(grade(90), 'A'));
test('89 is a B', () => eq(grade(89), 'B'));
test('70 is a C', () => eq(grade(70), 'C'));
test('69 is an F', () => eq(grade(69), 'F'));
test('0 is an F', () => eq(grade(0), 'F'));
