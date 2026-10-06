test('15 is FizzBuzz', () => eq(fizzbuzz(15), 'FizzBuzz'));
test('30 is FizzBuzz', () => eq(fizzbuzz(30), 'FizzBuzz'));
test('9 is Fizz', () => eq(fizzbuzz(9), 'Fizz'));
test('10 is Buzz', () => eq(fizzbuzz(10), 'Buzz'));
test('7 stays 7', () => eq(fizzbuzz(7), 7));
test('1 stays 1', () => eq(fizzbuzz(1), 1));
