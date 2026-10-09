const chunks = [
  Buffer.from('{"name":'),
  Buffer.from('"Ana"'),
  Buffer.from(',"age":31}'),
];
const body = Buffer.concat(chunks);

console.log(body.length, 'bytes');
console.log(body.toString());
console.log(JSON.parse(body.toString()).name);
