function sumNumbers(values) {
  let total = 0;
  for (const v of values) {
    if (typeof v !== 'number') {
      continue;
    }
    total += v;
  }
  return total;
}
