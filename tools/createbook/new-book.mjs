// Scaffold a new book (or add chapters to one) from an outline JSON. This is the first step of the 786CreateBook skill.
//   node tools/createbook/new-book.mjs <outline.json>             create content/books/<slug>/ (refuses if it exists)
//   node tools/createbook/new-book.mjs <outline.json> --append    add the outline's chapters after the book's existing ones
//   node tools/createbook/new-book.mjs <outline.json> --dry-run   check and print what would be made; write nothing
//   --json   print the result as JSON (the skill reads it)        BOOKS_DIR=…   use another books folder (tests, dry runs)
// It writes book.json, syllabus.json, versions.json and _style/BOOK.md. It never writes a page: the pages come next.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { BOOKS_DIR, BOOK_RE, ROOT, bookSlugs, loadBook } from '../lib/books.mjs';
import { detect } from '../lib/runners.mjs';
import { hueFromSlug, normalizeBook } from '../../server/lib/book-meta.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const pad2 = (n) => String(n).padStart(2, '0');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const file = args.find((a) => !a.startsWith('--'));
const asJson = flag('--json');
const fail = (msg, code = 1) => {
  if (asJson) console.log(JSON.stringify({ ok: false, error: msg }));
  else console.error(`✖ ${msg}`);
  process.exit(code);
};
if (!file || flag('--help')) {
  console.log('usage: node tools/createbook/new-book.mjs <outline.json> [--append] [--dry-run] [--json]');
  process.exit(file ? 0 : 1);
}

// ------------------------------------------------------------------ read and check the outline
let outline;
try { outline = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail(`cannot read ${file}: ${e.message}`); }
const schema = JSON.parse(readFileSync(join(ROOT, 'content', '_schema', 'outline.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
if (!ajv.validate(schema, outline)) {
  const lines = ajv.errors.slice(0, 8).map((e) => `${e.instancePath || '(outline)'} ${e.message}`);
  fail(`the outline is not valid:\n    ${lines.join('\n    ')}`);
}
const slug = outline.slug;
if (!BOOK_RE.test(slug)) fail(`"${slug}" is not a valid slug`);
const dir = join(BOOKS_DIR, slug);
const append = flag('--append');
const exists = existsSync(join(dir, 'book.json'));
if (exists && !append) fail(`there is already a book "${slug}". Use --append to add chapters to it, or choose another slug.`, 2);
if (!exists && append) fail(`--append needs an existing book, and there is no "${slug}" (known: ${bookSlugs().join(', ') || 'none'})`, 2);
// a deleted book's chats, notes and progress would silently attach themselves to a new book with the same name
const savedData = join(process.env.DATA_DIR ? resolve(ROOT, process.env.DATA_DIR) : join(ROOT, 'data'), 'books', slug);
if (!exists && existsSync(savedData) && !flag('--reuse-data')) fail(`there is saved reading data for an earlier "${slug}" in ${savedData.replace(`${ROOT}/`, '')}. Choose another slug, delete that folder if the old data is not wanted, or pass --reuse-data to keep it.`, 2);

for (const [i, c] of outline.chapters.entries()) {
  if (!c.tagline?.trim()) fail(`chapter ${i + 1} ("${c.title}") needs a "tagline": it is the line under the chapter title`);
  if (!c.outcomes?.length) fail(`chapter ${i + 1} ("${c.title}") needs "outcomes" (2 to 5 things the learner can do afterwards)`);
}

// ------------------------------------------------------------------ book identity
const others = bookSlugs().filter((s) => s !== slug).flatMap((s) => { try { return [loadBook(s)]; } catch { return []; } }); // a broken sibling must not stop a new book
const farthest = (start, taken) => {
  // the first of a few candidate hues that sits at least 45° from every other book; else the one furthest from all of them
  let best = start;
  let bestGap = -1;
  for (let k = 0; k < 10; k++) {
    const h = (start + k * 37) % 360;
    const gap = taken.length ? Math.min(...taken.map((t) => Math.min(Math.abs(h - t), 360 - Math.abs(h - t)))) : 360;
    if (gap >= 45) return h;
    if (gap > bestGap) { best = h; bestGap = gap; }
  }
  return best;
};

let book;
let syllabus;
if (append) {
  book = loadBook(slug);
  syllabus = structuredClone(book.syllabus);
} else {
  const raw = {
    slug,
    title: outline.title,
    tagline: outline.tagline || '',
    audience: outline.audience || '',
    hue: outline.hue ?? farthest(hueFromSlug(slug), others.map((b) => b.meta.hue)),
    order: outline.order ?? Math.max(0, ...others.map((b) => (Number.isFinite(b.meta.order) && b.meta.order < 100 ? b.meta.order : 0))) + 10,
    profile: outline.profile || 'none',
    locale: outline.locale || 'en',
    ...(outline.monogram ? { monogram: outline.monogram } : {}),
    tutor: {
      name: outline.tutor?.name || outline.title,
      about: outline.tutor?.about || `a short, crisp, book-style course on ${outline.title}${outline.audience ? `, for ${outline.audience}` : ''}`,
      ...(outline.tutor?.examples ? { examples: outline.tutor.examples } : {}),
      learnerRole: outline.tutor?.learnerRole || 'learner',
      mentorRole: outline.tutor?.mentorRole || 'an experienced mentor',
    },
    runtime: outline.runtime || (outline.profile === 'js' ? { bannedApis: ['Object.groupBy', 'Map.groupBy', 'Promise.withResolvers', 'Array.fromAsync', 'fs.glob', 'new WebSocket'], banHint: 'missing from Node 20' } : {}),
  };
  try { normalizeBook(raw, slug); } catch (e) { fail(`book.json would be invalid: ${e.message}`); }
  book = { slug, meta: raw };
  syllabus = { version: 1, chapters: [], topics: [] };
}

// ------------------------------------------------------------------ chapters and pages
// number after the highest existing chapter id (a book may start at c00 or have gaps), never after the count
const startN = Math.max(0, ...syllabus.chapters.map((c) => Number(String(c.id).slice(1)) || 0));
if (startN + outline.chapters.length > 99) fail(`a book holds at most 99 chapters (its last is c${pad2(startN)}, the outline adds ${outline.chapters.length})`);
const baseHue = book.meta.hue ?? 25;
const added = [];
for (const [i, c] of outline.chapters.entries()) {
  const n = startN + i + 1;
  const id = `c${pad2(n)}`;
  if (syllabus.chapters.some((c) => c.id === id)) fail(`chapter ${id} already exists`);
  const topicIds = [];
  for (const [j, t] of c.topics.entries()) {
    const spec = typeof t === 'string' ? { title: t } : t;
    if (spec.kind === 'challenge' && !['js', 'mixed'].includes(book.meta.profile)) fail(`"${spec.title}": challenge pages run JavaScript in the browser, so a ${book.meta.profile} book cannot have them. Make it a normal page (kind "lecture"): its quiz can ask the learner to predict or fix code.`);
    const tid = `${id}-t${pad2(j + 1)}`;
    syllabus.topics.push({ id: tid, chapter: id, n: j + 1, kind: spec.kind || 'lecture', depth: spec.depth || 2, source: spec.title.trim() });
    topicIds.push(tid);
  }
  const ch = { id, n, title: c.title.trim(), tagline: c.tagline.trim(), outcomes: c.outcomes.map((o) => o.trim()), hue: c.hue ?? (baseHue + 24 * (n - 1)) % 360, topics: topicIds };
  syllabus.chapters.push(ch);
  added.push(ch);
}
const newPages = syllabus.topics.filter((t) => added.some((c) => c.id === t.chapter));

// ------------------------------------------------------------------ files
const tool = (bin, args_) => { const d = detect(bin, args_); return d.ok ? d.version : null; };
const versions = {
  note: 'Versions that example code is verified against. They can be newer than most training data: trust only what you have run. Add every library a page imports to content/books/package.json and run `npm run examples:install`.',
  node: process.versions.node.split('.').slice(0, 2).join('.'),
  ...(tool('python3') ? { python: tool('python3') } : {}),
  ...(tool('java', ['-version']) ? { java: tool('java', ['-version']) } : {}),
  ...(tool('cc') ? { cc: tool('cc') } : {}),
};
const profile = book.meta.profile;
const bookMd = readFileSync(join(HERE, 'templates', 'BOOK.md.tpl'), 'utf8')
  .replaceAll('{{TITLE}}', book.meta.title)
  .replaceAll('{{SLUG}}', slug)
  .replaceAll('{{AUDIENCE}}', book.meta.audience || 'a motivated adult learner')
  .replaceAll('{{PROFILE}}', profile)
  .replaceAll('{{RUN_RULES}}', RUN_RULES(profile, versions))
  .replaceAll('{{BANNED}}', book.meta.runtime?.bannedApis?.length ? `Do not use: ${book.meta.runtime.bannedApis.map((a) => `\`${a}\``).join(', ')} (${book.meta.runtime.banHint || 'not available here'}).` : 'No API restrictions beyond the shared rules.');

function RUN_RULES(p, v) {
  const rules = {
    js: `Examples are JavaScript for **Node ${v.node}**, as ES modules (\`.mjs\`). \`run: "browser"\` for pure JavaScript, \`"captured"\` when real Node is needed.`,
    python: `Examples are **Python ${v.python || '3'}** (\`.py\`), run for real. They are \`run: "captured"\` (static code, recorded output). There is no in-browser Python.`,
    java: `Examples are **Java ${v.java || '17'}**, one source file each (\`Main.java\` with \`public class Main\`), run with \`java Main.java\`. \`run: "captured"\`.`,
    c: `Examples are **C** (\`.c\`), compiled with \`cc\` and run for real. \`run: "captured"\`. Keep each program small and deterministic.`,
    none: 'This is a concepts book: no code is run. Use `run: "static"` for any snippet and mark it `illustrative: true`; lean on diagrams and animations.',
    mixed: 'Several languages are run for real (`.mjs`, `.py`, `.java`, `.c`, `.sh`). Use `run: "captured"` for all but pure-JavaScript `browser` snippets.',
  };
  return rules[p] || rules.none;
}

const summary = {
  ok: true,
  slug,
  title: book.meta.title,
  dir: dir.replace(`${ROOT}/`, ''),
  mode: append ? 'append' : 'create',
  dryRun: flag('--dry-run'),
  chapters: added.map((c) => ({ id: c.id, title: c.title, hue: c.hue, pages: c.topics.length })),
  pages: newPages.length,
  ids: newPages.map((t) => t.id),
  hue: book.meta.hue,
  order: book.meta.order,
  profile,
  url: `http://localhost:4000/b/${slug}`,
};

if (!flag('--dry-run')) {
  mkdirSync(join(dir, '_style'), { recursive: true });
  writeFileSync(join(dir, 'syllabus.json'), `${JSON.stringify(syllabus, null, 2)}\n`);
  if (!append) {
    writeFileSync(join(dir, 'book.json'), `${JSON.stringify(book.meta, null, 2)}\n`);
    writeFileSync(join(dir, 'versions.json'), `${JSON.stringify(versions, null, 2)}\n`);
    writeFileSync(join(dir, '_style', 'BOOK.md'), bookMd);
  }
}

if (asJson) console.log(JSON.stringify(summary));
else {
  console.log(`${flag('--dry-run') ? '(dry run) would ' : ''}${append ? 'add to' : 'create'} ${summary.dir}`);
  for (const c of summary.chapters) console.log(`  ${c.id}  ${c.title}  (${c.pages} pages, hue ${c.hue})`);
  console.log(`${summary.pages} pages · profile ${profile} · shelf position ${summary.order ?? 'unchanged'}`);
  if (!flag('--dry-run')) console.log(`next: node tools/validate.mjs --book ${slug}   ·   then write the pages (see tools/createbook/SKILL.md)`);
}
