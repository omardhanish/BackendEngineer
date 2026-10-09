function add(a, b) { return a + b; }             // declaration
const mul = function (a, b) { return a * b; };   // expression
const sub = (a, b) => a - b;                     // arrow: short form
const hi = (name = 'friend') => `hi ${name}`;    // default parameter

const op = add;                                  // a function is a value
console.log(op(2, 3), mul(2, 3), sub(2, 3));
console.log(hi(), hi('Ada'));
