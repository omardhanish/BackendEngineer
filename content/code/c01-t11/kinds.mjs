let tries = 0;
do {
  tries++;                   // the body runs once, although the test is false
} while (tries < 0);
console.log('do...while', tries);

const stock = { apples: 3, pears: 0 };
for (const key in stock) {   // key is each property name, as a string
  console.log('for...in', key, stock[key]);
}
