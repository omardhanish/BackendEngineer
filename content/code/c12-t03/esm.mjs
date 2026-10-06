import { readFile } from 'node:fs/promises';

const url = new URL('./package.json', import.meta.url);
const pkg = JSON.parse(await readFile(url, 'utf8'));

console.log(pkg.name, pkg.type);
console.log(pkg.scripts.start);
console.log(typeof require, typeof __dirname);
