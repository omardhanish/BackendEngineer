import fs from 'node:fs/promises';

await fs.mkdir('notes');
await fs.writeFile('notes/todo.txt', 'buy milk\n');
await fs.appendFile('notes/todo.txt', 'call Sam\n');
console.log((await fs.readFile('notes/todo.txt', 'utf8')).trimEnd());
console.log(await fs.readdir('notes'));

try {
  await fs.readFile('notes/nope.txt', 'utf8');
} catch (err) {
  console.log(err.code);
}
await fs.rm('notes', { recursive: true });
