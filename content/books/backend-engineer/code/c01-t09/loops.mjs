const prices = [4, 6, 10];
for (let i = 0; i < prices.length; i++) {      // count with an index
  console.log('for', i, prices[i]);
}

let n = 100, steps = 0;
while (n >= 1) { n = n / 2; steps++; }         // passes not known in advance
console.log('while', steps);

for (const p of prices) {                      // each value, no index
  if (p === 4) continue;                       // skip this pass
  if (p === 10) break;                         // leave the loop
  console.log('of', p);
}
