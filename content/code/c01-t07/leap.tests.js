test('2024 is a leap year', () => eq(isLeapYear(2024), true));
test('2023 is not', () => eq(isLeapYear(2023), false));
test('1996 is a leap year', () => eq(isLeapYear(1996), true));
test('1900 is not', () => eq(isLeapYear(1900), false));
test('2000 is a leap year', () => eq(isLeapYear(2000), true));
test('2100 is not', () => eq(isLeapYear(2100), false));
