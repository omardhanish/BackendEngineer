function reverseText(text) {
  let result = '';
  for (const ch of text) {
    result = ch + result;
  }
  return result;
}
