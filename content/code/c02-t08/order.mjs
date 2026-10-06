import fs from 'node:fs';

fs.writeFileSync('data.txt', 'hello');
console.log('1 before the sync read');
console.log('2 sync read got', fs.readFileSync('data.txt', 'utf8'));

fs.readFile('data.txt', 'utf8', (err, text) => {
  console.log('4 callback got', text);
  fs.rmSync('data.txt');
});
console.log('3 after calling readFile');
