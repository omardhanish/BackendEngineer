// One-time move of the original single-book data (data/chats, data/notes, data/progress.json) into the default book's
// folder (data/books/<slug>/). It is deliberately paranoid, because this is someone's saved learning history:
//   1. snapshot everything into data/.backups/pre-library-<time>/
//   2. COPY (never move) into a staging folder next to the new place and verify every file by size and SHA-256
//   3. write a marker, rename the staging folder into place in one step, and only then remove the originals
// The copy is staged so that a crash half way (power loss, kill -9) leaves nothing in the real place: the next start
// wipes the staging folder and starts again. Any failure before step 3 leaves the originals untouched and refuses to start.
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

const exists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };

async function filesUnder(dir, base = dir) {
  let ents;
  try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const out = [];
  for (const ent of ents) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await filesUnder(p, base));
    else if (ent.isFile()) out.push(p.slice(base.length + 1));
  }
  return out;
}

const sha = async (file) => createHash('sha256').update(await fs.readFile(file)).digest('hex');

async function copyVerified(from, to) {
  await fs.mkdir(dirname(to), { recursive: true, mode: 0o700 });
  await fs.copyFile(from, to);
  const [a, b] = await Promise.all([fs.stat(from), fs.stat(to)]);
  if (a.size !== b.size || (await sha(from)) !== (await sha(to))) throw new Error(`verification failed for ${to}`);
}

/** @returns {{migrated: boolean, files?: number, reason?: string, backup?: string}} */
export async function migrateLegacyData({ config, log }) {
  const dir = config.dataDir;
  const slug = config.defaultBook;
  const target = join(dir, 'books', slug);
  if (await exists(join(target, '.migrated'))) return { migrated: false, reason: 'already migrated' };
  if (!(await exists(join(config.booksDir, slug, 'book.json')))) return { migrated: false, reason: 'the default book is not installed' };

  const items = [];
  for (const sub of ['chats', 'notes']) for (const f of await filesUnder(join(dir, sub))) items.push([join(sub, f), join(dir, sub, f)]);
  for (const f of ['progress.json', 'progress.json.bak']) if (await exists(join(dir, f))) items.push([f, join(dir, f)]);
  if (!items.length) return { migrated: false, reason: 'no legacy data' };
  let occupied;
  try { occupied = (await filesUnder(target)).length; } catch (e) { throw new Error(`Could not look at ${target} (${e.message}). Nothing was changed.`); }
  if (occupied) {
    log?.warn(`found old-layout data in ${dir} but ${target} already has files; leaving both untouched`);
    return { migrated: false, reason: 'target not empty' };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = join(dir, '.backups', `pre-library-${stamp}`);
  const staging = join(dir, 'books', `.${slug}.migrating`);
  try {
    await fs.rm(staging, { recursive: true, force: true }); // what an earlier, interrupted attempt left behind
    for (const [rel, src] of items) await copyVerified(src, join(backup, rel)); // 1. snapshot
    for (const [rel, src] of items) await copyVerified(src, join(staging, rel)); // 2. copy + verify
    await fs.writeFile(join(staging, '.migrated'), JSON.stringify({ at: new Date().toISOString(), files: items.length, backup }), { mode: 0o600 });
    await fs.rename(staging, target); // atomic; replaces the empty folder if there is one
  } catch (e) {
    await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
    throw new Error(`Could not move your saved chats, notes and progress safely (${e.message}). Nothing was changed.`);
  }
  // 3. the copies are verified and snapshotted twice: now the old-layout originals can go
  await fs.rm(join(dir, 'chats'), { recursive: true, force: true });
  await fs.rm(join(dir, 'notes'), { recursive: true, force: true });
  for (const f of ['progress.json', 'progress.json.bak']) await fs.rm(join(dir, f), { force: true });
  log?.warn(`moved ${items.length} saved file(s) into data/books/${slug}/ (snapshot kept in ${backup})`);
  return { migrated: true, files: items.length, backup };
}
