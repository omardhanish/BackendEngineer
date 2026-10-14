// Fetches the Java libraries that Java examples may use into content/books/java-lib/ (git-ignored),
// verifying each jar's SHA-256 so a tampered download is refused. Run by `npm run examples:install`.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIBS = [
  {
    file: 'postgresql-42.7.4.jar',
    url: 'https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar',
    sha256: '188976721ead8e8627eb6d8389d500dccc0c9bebd885268a3047180274a6031e',
  },
];

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'books', 'java-lib');
mkdirSync(dir, { recursive: true });
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

for (const lib of LIBS) {
  const dest = join(dir, lib.file);
  if (existsSync(dest) && sha(readFileSync(dest)) === lib.sha256) { console.log(`✔ ${lib.file} (already installed)`); continue; }
  const res = await fetch(lib.url);
  if (!res.ok) throw new Error(`${lib.file}: download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha(buf) !== lib.sha256) throw new Error(`${lib.file}: checksum mismatch, refusing to install`);
  writeFileSync(dest, buf);
  console.log(`✔ ${lib.file} installed`);
}
