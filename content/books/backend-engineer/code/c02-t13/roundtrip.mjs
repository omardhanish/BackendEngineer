const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // first bytes of a PNG file
const viaString = Buffer.from(png.toString('utf8'));

console.log(png);
console.log(viaString);
console.log(png.equals(viaString));
