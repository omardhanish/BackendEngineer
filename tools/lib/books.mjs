// The library on disk, for every tool: content/books/<slug>/{book.json, syllabus.json, <chapter>/, code/, roleplay/}.
// Tools ask this module for books and paths instead of hard-coding "content/".
//   --book a,b       only these books (default: all)        BOOKS_DIR=…   use another folder of books (tests, dry runs)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBook } from '../../server/lib/book-meta.js';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT = join(ROOT, 'content');
export const BOOKS_DIR = process.env.BOOKS_DIR ? resolve(ROOT, process.env.BOOKS_DIR) : join(CONTENT, 'books');
export const BOOK_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const PAGE_ID_RE = /^c\d\d-t\d\d$/;

export function bookSlugs(dir = BOOKS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && BOOK_RE.test(e.name) && existsSync(join(dir, e.name, 'book.json')))
    .map((e) => e.name)
    .sort();
}

/** @returns {{slug, dir, meta, syllabus, topics: Map<string, object>, chapters: Map<string, object>}} */
export function loadBook(slug, dir = BOOKS_DIR) {
  if (!BOOK_RE.test(slug)) throw new Error(`"${slug}" is not a valid book name`);
  const bdir = join(dir, slug);
  if (!existsSync(join(bdir, 'book.json'))) throw new Error(`no book "${slug}" in ${dir} (known: ${bookSlugs(dir).join(', ') || 'none'})`);
  const meta = normalizeBook(JSON.parse(readFileSync(join(bdir, 'book.json'), 'utf8')), slug);
  const syllabusPath = join(bdir, 'syllabus.json');
  const syllabus = existsSync(syllabusPath) ? JSON.parse(readFileSync(syllabusPath, 'utf8')) : { version: 1, chapters: [], topics: [] };
  return { slug, dir: bdir, meta, syllabus, topics: new Map(syllabus.topics.map((t) => [t.id, t])), chapters: new Map(syllabus.chapters.map((c) => [c.id, c])) };
}

/** Splits process.argv.slice(2) into book names, page ids and everything else. */
export function parseArgs(argv) {
  const books = [];
  const ids = [];
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book') books.push(...String(argv[++i] || '').split(',').filter(Boolean));
    else if (a.startsWith('--book=')) books.push(...a.slice(7).split(',').filter(Boolean));
    else if (PAGE_ID_RE.test(a)) ids.push(a);
    else rest.push(a);
  }
  return { books: books.length ? books : null, ids, rest };
}

/** The books a tool should work on: the ones named with --book, else all. Throws on an unknown name. */
export function pickBooks(names, dir = BOOKS_DIR) {
  const all = bookSlugs(dir);
  for (const n of names || []) if (!all.includes(n)) throw new Error(`unknown book "${n}" (known: ${all.join(', ') || 'none'})`);
  return (names || all).map((s) => loadBook(s, dir));
}

/** Every written page of a book: Map id -> path of its JSON file. */
export function writtenPages(book) {
  const out = new Map();
  for (const ch of book.syllabus.chapters) {
    const d = join(book.dir, ch.id);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (f.endsWith('.json')) out.set(f.slice(0, -5), join(d, f));
  }
  return out;
}
