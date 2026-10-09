test('counts down from 3', () => eq(countdown(3), [3, 2, 1]));
test('counts down from 5', () => eq(countdown(5), [5, 4, 3, 2, 1]));
test('1 gives [1]', () => eq(countdown(1), [1]));
test('zero gives an empty array', () => eq(countdown(0), []));
test('negative gives an empty array', () => eq(countdown(-2), []));
