const text = 'Aé€';
const buf = Buffer.from(text, 'utf8');

console.log(text.length, buf.length);
console.log(buf);
console.log(buf.toString('utf8'));
