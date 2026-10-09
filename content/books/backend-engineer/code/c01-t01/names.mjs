// Which names exist depends on where this code runs
const names = ['Array', 'Promise', 'setTimeout', 'document', 'process'];

for (const name of names) {
  console.log(name.padEnd(10), typeof globalThis[name]);
}
