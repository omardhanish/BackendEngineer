function sumBeforeNegative(numbers) {
  let total = 0;
  for (const n of numbers) {
    if (n < 0) {
      break;
    }
    total += n;
  }
  return total;
}
