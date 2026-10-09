function repeat(times, action) {
  for (let i = 0; i < times; i++) action(i);
}
repeat(2, (i) => console.log('pass', i));

const prices = [5, 12, 8];
const doubled = prices.map((p) => p * 2);
const cheap = prices.filter((p) => p < 10);
console.log(doubled.join(' '), '|', cheap.join(' '));
