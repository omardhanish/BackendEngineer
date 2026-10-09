// The tools behind the 786CreateBook skill: scaffold a book from an outline, plan the batches, install the skill text.
// Everything runs against a temporary books folder (BOOKS_DIR) and a temporary HOME, never the real library.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = mkdtempSync(join(tmpdir(), 'be-createbook-'));
const BOOKS = join(TMP, 'books');
const HOME = join(TMP, 'home');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const node = (script, args, env = {}) => spawnSync(process.execPath, [join(ROOT, script), ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, BOOKS_DIR: BOOKS, HOME, ...env } });
const tool = (name, args) => node(`tools/createbook/${name}.mjs`, args);
const outline = (o, name = 'outline') => { const f = join(TMP, `${name}.json`); writeFileSync(f, JSON.stringify(o)); return f; };

const OUTLINE = {
  slug: 'py-basics',
  title: 'Python Basics',
  tagline: 'Write and run your first programs.',
  audience: 'an adult who has never programmed',
  profile: 'python',
  chapters: [
    { title: 'Getting started', tagline: 'Run code and see it work.', outcomes: ['Run a script', 'Read an error'], topics: ['What Python is', 'Variables and types', { title: 'Printing', depth: 1 }] },
    { title: 'Control flow', tagline: 'Decide and repeat.', outcomes: ['Branch with if', 'Loop over a list'], topics: ['if and else', { title: 'Deep: how loops work', depth: 3 }, 'for loops', 'while loops', 'break and continue', 'Nested loops'] },
  ],
};

before(() => { mkdirSync(BOOKS, { recursive: true }); mkdirSync(HOME, { recursive: true }); });
after(() => rmSync(TMP, { recursive: true, force: true }));

describe('new-book', () => {
  test('--dry-run checks the outline and writes nothing', () => {
    const r = tool('new-book', [outline(OUTLINE), '--dry-run', '--json']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true);
    assert.equal(out.dryRun, true);
    assert.equal(out.pages, 9);
    assert.equal(existsSync(join(BOOKS, 'py-basics')), false);
  });

  test('creates book.json, syllabus.json, versions.json and BOOK.md', () => {
    const r = tool('new-book', [outline(OUTLINE), '--json']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const dir = join(BOOKS, 'py-basics');
    const book = read(join(dir, 'book.json'));
    assert.equal(book.slug, 'py-basics');
    assert.equal(book.profile, 'python');
    assert.ok(Number.isInteger(book.hue) && book.hue >= 0 && book.hue < 360);
    assert.equal(book.tutor.name, 'Python Basics');
    const syl = read(join(dir, 'syllabus.json'));
    assert.deepEqual(syl.chapters.map((c) => [c.id, c.topics.length]), [['c01', 3], ['c02', 6]]);
    assert.equal(syl.topics[0].id, 'c01-t01');
    assert.equal(syl.topics[0].source, 'What Python is');
    assert.equal(syl.topics[2].depth, 1);
    assert.equal(syl.topics[0].depth, 2, 'depth defaults to 2');
    assert.equal(syl.topics[0].kind, 'lecture');
    assert.ok(syl.chapters.every((c) => c.hue >= 0 && c.hue < 360 && c.outcomes.length >= 2));
    assert.match(readFileSync(join(dir, '_style', 'BOOK.md'), 'utf8'), /Python Basics — rules for this book/);
    assert.ok(read(join(dir, 'versions.json')).node);
  });

  test('the scaffold passes the validator with zero pages written', () => {
    const r = node('tools/validate.mjs', ['--book', 'py-basics']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /0 error/);
  });

  test('refuses to overwrite an existing book (exit 2)', () => {
    const r = tool('new-book', [outline(OUTLINE), '--json']);
    assert.equal(r.status, 2);
    assert.match(JSON.parse(r.stdout).error, /already a book "py-basics"/);
  });

  test('--append adds chapters after the existing ones and leaves book.json alone', () => {
    const before_ = readFileSync(join(BOOKS, 'py-basics', 'book.json'), 'utf8');
    const more = { slug: 'py-basics', title: 'Python Basics', chapters: [{ title: 'Functions', tagline: 'Reuse work.', outcomes: ['Write a function', 'Return a value'], topics: ['def and return', 'Default arguments'] }] };
    const r = tool('new-book', [outline(more, 'more'), '--append', '--json']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const out = JSON.parse(r.stdout);
    assert.deepEqual(out.ids, ['c03-t01', 'c03-t02']);
    const syl = read(join(BOOKS, 'py-basics', 'syllabus.json'));
    assert.equal(syl.chapters.length, 3);
    assert.equal(syl.topics.length, 11);
    assert.equal(readFileSync(join(BOOKS, 'py-basics', 'book.json'), 'utf8'), before_);
    assert.equal(node('tools/validate.mjs', ['--book', 'py-basics']).status, 0);
  });

  test('--append needs an existing book', () => {
    const r = tool('new-book', [outline({ ...OUTLINE, slug: 'nope' }), '--append', '--json']);
    assert.equal(r.status, 2);
  });

  test('a second book gets its own colour, a later shelf position and its own folder', () => {
    const r = tool('new-book', [outline({ ...OUTLINE, slug: 'py-two', title: 'Python Two' }), '--json']);
    assert.equal(r.status, 0, r.stderr);
    const a = read(join(BOOKS, 'py-basics', 'book.json'));
    const b = read(join(BOOKS, 'py-two', 'book.json'));
    const gap = Math.min(Math.abs(a.hue - b.hue), 360 - Math.abs(a.hue - b.hue));
    assert.ok(gap >= 30, `hues ${a.hue} and ${b.hue} are too close`);
    assert.ok(b.order > a.order);
  });

  test('--append numbers after the highest chapter id, so a book that starts at c00 does not skip or collide', () => {
    const dir = join(BOOKS, 'zero-start');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'book.json'), JSON.stringify({ slug: 'zero-start', title: 'Zero start', profile: 'none' }));
    const topic = (id, chapter) => ({ id, chapter, n: 1, kind: 'lecture', depth: 2, source: 'x' });
    writeFileSync(join(dir, 'syllabus.json'), JSON.stringify({ version: 1, chapters: [{ id: 'c00', n: 0, title: 'Intro', topics: ['c00-t01'] }, { id: 'c01', n: 1, title: 'One', topics: ['c01-t01'] }, { id: 'c04', n: 4, title: 'Four', topics: ['c04-t01'] }], topics: [topic('c00-t01', 'c00'), topic('c01-t01', 'c01'), topic('c04-t01', 'c04')] }));
    const more = { slug: 'zero-start', title: 'Zero start', chapters: [{ title: 'Next', tagline: 'More.', outcomes: ['one', 'two'], topics: ['a page'] }] };
    const r = tool('new-book', [outline(more, 'zs'), '--append', '--json']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).ids, ['c05-t01'], 'after c04, the highest');
  });

  test('a broken sibling book does not stop a new book; saved data of an earlier book with the same name is not silently reused', () => {
    mkdirSync(join(BOOKS, 'broken-sibling'), { recursive: true });
    writeFileSync(join(BOOKS, 'broken-sibling', 'book.json'), '{ not json');
    const ok = tool('new-book', [outline({ ...OUTLINE, slug: 'after-broken' }, 'ab'), '--json']);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const data = join(TMP, 'data');
    mkdirSync(join(data, 'books', 'had-data', 'notes'), { recursive: true });
    const env = { DATA_DIR: data };
    const refused = node('tools/createbook/new-book.mjs', [outline({ ...OUTLINE, slug: 'had-data' }, 'hd'), '--json'], env);
    assert.equal(refused.status, 2);
    assert.match(JSON.parse(refused.stdout).error, /saved reading data/);
    assert.equal(node('tools/createbook/new-book.mjs', [outline({ ...OUTLINE, slug: 'had-data' }, 'hd'), '--json', '--reuse-data'], env).status, 0);
  });

  test('rejects bad outlines with a message that says what is wrong', () => {
    const bad = (o) => tool('new-book', [outline(o, 'bad'), '--json']);
    assert.match(JSON.parse(bad({ ...OUTLINE, slug: 'Bad Slug' }).stdout).error, /slug/);
    assert.match(JSON.parse(bad({ slug: 'x', title: 'X', chapters: [] }).stdout).error, /chapters/);
    const noOutcomes = { ...OUTLINE, slug: 'x1', chapters: [{ title: 'A', tagline: 't', topics: ['a'] }] };
    assert.match(JSON.parse(bad(noOutcomes).stdout).error, /outcomes/);
    const noTagline = { ...OUTLINE, slug: 'x2', chapters: [{ title: 'A', outcomes: ['one', 'two'], topics: ['a'] }] };
    assert.match(JSON.parse(bad(noTagline).stdout).error, /tagline/);
    assert.equal(existsSync(join(BOOKS, 'x1')), false);
  });

  test('a Python book cannot have a challenge page, a JavaScript book can', () => {
    const ch = (profile, slug) => ({ slug, title: 'T', profile, chapters: [{ title: 'A', tagline: 't', outcomes: ['one', 'two'], topics: [{ title: 'Practice', kind: 'challenge' }] }] });
    const py = tool('new-book', [outline(ch('python', 'ch-py'), 'c1'), '--json']);
    assert.equal(py.status, 1);
    assert.match(JSON.parse(py.stdout).error, /challenge pages run JavaScript/);
    const js = tool('new-book', [outline(ch('js', 'ch-js'), 'c2'), '--json']);
    assert.equal(js.status, 0, js.stdout);
    assert.deepEqual(read(join(BOOKS, 'ch-js', 'book.json')).runtime.bannedApis.includes('Object.groupBy'), true);
  });
});

describe('plan', () => {
  test('splits unwritten pages into even batches that never cross a chapter', () => {
    const r = tool('plan', ['py-basics', '--size', '4']);
    assert.equal(r.status, 0, r.stderr);
    const p = JSON.parse(r.stdout);
    assert.equal(p.total, 11);
    assert.equal(p.written, 0);
    assert.deepEqual(p.batches.map((b) => [b.batch, b.pages.length]), [['c01', 3], ['c02a', 3], ['c02b', 3], ['c03', 2]]);
    assert.ok(p.batches.every((b) => b.pages.every((pg) => pg.chapter === b.chapter)));
    const second = p.batches[1].pages[0];
    assert.equal(second.id, 'c02-t01');
    assert.equal(second.previous, 'Printing');
    assert.equal(second.heading, 'if and else');
  });

  test('--pilot picks three pages that show the range (first page, a deep page, a code-flavoured page)', () => {
    const p = JSON.parse(tool('plan', ['py-basics', '--pilot']).stdout);
    const ids = p.batches.flatMap((b) => b.pages.map((x) => x.id));
    assert.equal(ids.length, 3);
    assert.ok(ids.includes('c01-t01'));
    assert.ok(ids.includes('c02-t02'), 'the depth-3 page');
  });

  test('pages that already exist are not planned again', () => {
    mkdirSync(join(BOOKS, 'py-basics', 'c01'), { recursive: true });
    writeFileSync(join(BOOKS, 'py-basics', 'c01', 'c01-t01.json'), '{"title":"x"}');
    const p = JSON.parse(tool('plan', ['py-basics']).stdout);
    assert.equal(p.written, 1);
    assert.equal(p.planned, 10);
    assert.ok(!p.batches.some((b) => b.pages.some((x) => x.id === 'c01-t01')));
    assert.equal(p.batches[0].pages[0].id, 'c01-t02');
  });

  test('--chapter limits the plan; an unknown book is an error', () => {
    const p = JSON.parse(tool('plan', ['py-basics', '--chapter', 'c03']).stdout);
    assert.deepEqual(p.batches.map((b) => b.chapter), ['c03']);
    assert.equal(tool('plan', ['no-such-book']).status, 1);
  });
});

describe('install-skill', () => {
  test('installs the skill with this project filled in, and --check agrees', () => {
    const r = tool('install-skill', []);
    assert.equal(r.status, 0, r.stderr);
    const f = join(HOME, '.claude', 'skills', '786createbook', 'SKILL.md');
    const text = readFileSync(f, 'utf8');
    assert.match(text, /^---\nname: 786createbook\n/);
    assert.match(text, /\nversion: 1\.0\.0\n/);
    assert.ok(text.includes(ROOT), 'the project folder is filled in');
    assert.ok(!text.includes('{{'), 'no placeholder is left');
    assert.equal(tool('install-skill', ['--check']).status, 0);
    writeFileSync(f, `${text}\nlocal edit`);
    assert.equal(tool('install-skill', ['--check']).status, 1, 'a changed copy is reported');
    assert.equal(tool('install-skill', []).status, 0);
    assert.equal(tool('install-skill', ['--check']).status, 0);
  });

  test('every tool the skill tells the reader to run exists', () => {
    const text = readFileSync(join(ROOT, 'tools', 'createbook', 'SKILL.md'), 'utf8');
    const files = new Set([...text.matchAll(/(?:node|bash) (tools\/[\w./-]+)/g)].map((m) => m[1]));
    assert.ok(files.size >= 6, 'the skill names its tools');
    for (const f of files) assert.ok(existsSync(join(ROOT, f)), `the skill mentions ${f}, which does not exist`);
    for (const s of [...text.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1])) assert.ok(read(join(ROOT, 'package.json')).scripts[s], `npm run ${s} is not a script`);
    assert.ok(existsSync(join(ROOT, 'tools', 'createbook', 'author-workflow.js')));
  });
});
