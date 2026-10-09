function countdown(n) {
  const out = [];
  while (n >= 1) {
    out.push(n);
    n--;
  }
  return out;
}
