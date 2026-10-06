console.log(typeof greet); // function: functions are registered first
console.log(typeof later); // undefined: var exists, but holds undefined
try {
  console.log(hidden);
} catch (e) {
  console.log(e.name); // ReferenceError: let is in its dead zone
}

function greet() {}
var later = 5;
let hidden = 1;
