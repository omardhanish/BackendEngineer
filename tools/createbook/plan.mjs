// Work out what is left to write in a book and split it into batches for the author agents. Prints JSON.
//   node tools/createbook/plan.mjs <slug>                  every page not written yet, in batches of about 5, never across chapters
//   node tools/createbook/plan.mjs <slug> --pilot          just 3 pages that show the range of the book (the sample the learner approves)
//   node tools/createbook/plan.mjs <slug> --size 4         batch size (1 to 12)
//   node tools/createbook/plan.mjs <slug> --chapter c02    only that chapter
// "Written" means the page's JSON file exists. Nothing is written by this tool.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadBook } from '../lib/books.mjs';

const args = process.argv.slice(2);
const slug = args[0] && !args[0].startsWith('--') ? args[0] : null;
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i === -1 ? def : args[i + 1]; };
if (!slug) { console.error('usage: node tools/createbook/plan.mjs <slug> [--pilot] [--size N] [--chapter cNN]'); process.exit(1); }
let book;
try { book = loadBook(slug); } catch (e) { console.error(`✖ ${e.message}`); process.exit(1); }
const size = Math.min(12, Math.max(1, Number(opt('size', 5)) || 5));
const onlyChapter = opt('chapter', null);

const { chapters, topics } = book.syllabus;
const chapterOf = new Map(chapters.map((c) => [c.id, c]));
const isWritten = (t) => existsSync(join(book.dir, t.chapter, `${t.id}.json`));
const order = topics.map((t) => t.id);
const titleAt = (i) => (i >= 0 && i < order.length ? book.topics.get(order[i]).source : null);

const card = (t) => {
  const i = order.indexOf(t.id);
  const ch = chapterOf.get(t.chapter);
  return { id: t.id, heading: t.source, kind: t.kind, depth: t.depth, n: t.n, chapter: ch.id, chapterTitle: ch.title, previous: titleAt(i - 1), next: titleAt(i + 1) };
};

const todo = topics.filter((t) => !isWritten(t) && (!onlyChapter || t.chapter === onlyChapter));

function pickPilot() {
  const picked = [];
  const take = (t) => { if (t && !picked.includes(t)) picked.push(t); };
  take(todo[0]);
  const firstCh = todo.filter((t) => t.chapter === todo[0]?.chapter);
  take(todo.find((t) => t.depth === 3) || firstCh[Math.floor(firstCh.length / 2)]);
  take(todo.find((t) => t.kind !== 'lecture') || todo.find((t) => /code|build|write|practi[cs]e|example|function|loop|query|program/i.test(t.source)) || firstCh.at(-1));
  for (const t of todo) { if (picked.length >= 3) break; take(t); }
  return picked.slice(0, 3).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

const chosen = args.includes('--pilot') ? pickPilot() : todo;
const batches = [];
for (const ch of chapters) {
  const mine = chosen.filter((t) => t.chapter === ch.id);
  if (!mine.length) continue;
  const groups = Math.ceil(mine.length / size);
  const per = Math.ceil(mine.length / groups); // 6 pages with size 5 -> 3 + 3, not 5 + 1
  for (let g = 0; g < groups; g++) {
    const part = mine.slice(g * per, (g + 1) * per);
    if (part.length) batches.push({ batch: `${ch.id}${groups > 1 ? String.fromCharCode(97 + g) : ''}`, chapter: ch.id, chapterTitle: ch.title, outcomes: ch.outcomes || [], pages: part.map(card) });
  }
}

console.log(JSON.stringify({
  slug,
  title: book.meta.title,
  profile: book.meta.profile,
  pilot: args.includes('--pilot'),
  total: topics.length,
  written: topics.length - topics.filter((t) => !isWritten(t)).length,
  planned: chosen.length,
  batches,
}, null, 2));
