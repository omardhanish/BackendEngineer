test('counts vowels in hello', () => eq(countVowels('hello'), 2));
test('counts capitals too', () => eq(countVowels('HELLO'), 2));
test('mixed case sentence', () => eq(countVowels('Backend Engineer'), 6));
test('all ten vowels', () => eq(countVowels('AEIOUaeiou'), 10));
test('y is not a vowel', () => eq(countVowels('sky'), 0));
test('empty text', () => eq(countVowels(''), 0));
