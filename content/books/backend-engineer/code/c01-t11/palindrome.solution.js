function isPalindrome(text) {
  for (let i = 0, j = text.length - 1; i < j; i++, j--) {
    if (text[i] !== text[j]) {
      return false;
    }
  }
  return true;
}
