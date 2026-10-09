const limit = 3;
let count = 0;
count = count + 1;               // let allows reassignment
console.log(count, typeof count);
count = 'one';                   // the value changes type, not the variable
console.log(count, typeof count);

try { limit = 4; } catch (e) { console.log(e.name); }

if (limit > 0) {
  var leaked = 1;                // var ignores the block
  let hidden = 2;                // let stays inside it
}
console.log(typeof leaked, typeof hidden);
