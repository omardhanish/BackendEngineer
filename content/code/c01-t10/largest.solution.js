function largest(numbers) {
  let best = numbers[0];
  for (const n of numbers) {
    if (n > best) {
      best = n;
    }
  }
  return best;
}
