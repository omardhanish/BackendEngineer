test('level is a palindrome', () => eq(isPalindrome('level'), true));
test('noon is a palindrome', () => eq(isPalindrome('noon'), true));
test('node is not', () => eq(isPalindrome('node'), false));
test('ends match, middle does not', () => eq(isPalindrome('abca'), false));
test('case matters', () => eq(isPalindrome('Level'), false));
test('one character', () => eq(isPalindrome('a'), true));
test('empty text', () => eq(isPalindrome(''), true));
