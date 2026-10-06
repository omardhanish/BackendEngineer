import fs from 'node:fs';

try {
  fs.readFileSync('missing.txt', 'utf8');
} catch (err) {
  console.log('sync threw:', err.code);
}

fs.readFile('missing.txt', 'utf8', (err) => {
  console.log('callback got:', err.code);
});
console.log('readFile returned');
