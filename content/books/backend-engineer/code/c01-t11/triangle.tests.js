test('three rows', () => eq(triangle(3), ['*', '**', '***']));
test('four rows', () => eq(triangle(4), ['*', '**', '***', '****']));
test('one row', () => eq(triangle(1), ['*']));
test('zero rows', () => eq(triangle(0), []));
test('negative gives no rows', () => eq(triangle(-2), []));
