const a = Buffer.from('hi');          // text to bytes
const b = Buffer.from([104, 105]);    // byte values to bytes
const c = Buffer.alloc(2);            // two zero bytes

c[0] = 104;                           // write one byte
c[1] = 105;
console.log(a.equals(b), a.equals(c));
console.log(a[0], a.length);
console.log(a.toString('hex'), a.toString('base64'));
console.log(Buffer.from('aGk=', 'base64').toString());
