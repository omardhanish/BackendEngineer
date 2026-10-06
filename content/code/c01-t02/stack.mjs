function third() { console.log('third:  top of the stack'); }
function second() {
  console.log('second: calling third');
  third();
  console.log('second: back');
}
function first() {
  console.log('first:  calling second');
  second();
  console.log('first:  back');
}
first();
console.log('main:   stack is empty again');
