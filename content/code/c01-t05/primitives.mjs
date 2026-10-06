let a = 'cat';
let b = a;          // b gets its own copy
b = 'dog';
console.log(a, b);

const s = 'node';
s.toUpperCase();    // returns a new string; s is unchanged
console.log(s);

console.log(typeof null, typeof undefined, typeof 10n);
console.log(0.1 + 0.2 === 0.3);
console.log(NaN === NaN, Number.isNaN(NaN));
console.log('ab' === 'a' + 'b');
