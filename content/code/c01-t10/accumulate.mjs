function stats(numbers) {
  let count = 0;             // an accumulator can be more than one variable
  let total = 0;
  for (const n of numbers) {
    count++;
    total += n;
  }
  return count + ' numbers, total ' + total;
}

console.log(stats([4, 6, 10]));
console.log(stats([]));      // no passes: both start values come back
