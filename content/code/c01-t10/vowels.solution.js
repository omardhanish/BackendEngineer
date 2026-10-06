function countVowels(text) {
  let count = 0;
  for (const letter of text.toLowerCase()) {
    if ('aeiou'.includes(letter)) {
      count++;
    }
  }
  return count;
}
