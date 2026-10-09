// The library: several books in one app. Uses a fixture library of tiny books that DELIBERATELY share page ids,
// so any leak between books (pages, chats, notes, progress, tutor text, role-play keys) shows up as a failure.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFakeDeepSeek } from './helpers/fake-deepseek.mjs';

process.env.DEEPSEEK_API_KEY = 'sk-test-0000000000000000';
const fake = await startFakeDeepSeek();
process.env.DEEPSEEK_BASE_URL = fake.url;

const { loadConfig } = await import('../server/lib/env.js');
const { createContext, createApp } = await import('../server/app.js');
const { migrateLegacyData } = await import('../server/lib/migrate.js');

const TMP = mkdtempSync(join(tmpdir(), 'be-library-'));
const BOOKS = join(TMP, 'books');
const DATA = join(TMP, 'data');

const write = (p, data) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`); };
function makeBook(slug, { title, order, tutor, hue, roleplay } = {}) {
  const dir = join(BOOKS, slug);
  write(join(dir, 'book.json'), { slug, title, order, hue, tutor });
  const topics = [{ id: 'c01-t01', chapter: 'c01', n: 1, kind: 'lecture', depth: 1, source: `${title} first page` }];
  if (roleplay) topics.push({ id: 'c01-t02', chapter: 'c01', n: 2, kind: 'roleplay', depth: 3, source: 'A role-play' });
  write(join(dir, 'syllabus.json'), { version: 1, chapters: [{ id: 'c01', n: 1, title: 'Chapter one', hue: 200, topics: topics.map((t) => t.id) }], topics });
  write(join(dir, 'c01', 'c01-t01.json'), { title: `${title}: page one`, idea: `An idea from ${title}.`, points: ['a', 'b', 'c'], takeaway: 'ok' });
  if (roleplay) {
    write(join(dir, 'c01', 'c01-t02.json'), { title: 'Role-play', scenario: { brief: 'b', rubric: [] }, code: [] });
    write(join(dir, 'roleplay', 'c01-t02.key.json'), { persona: `SECRET-PERSONA-${slug}`, setup: 's', opening: 'Hello from the character', hidden: [], flaws: [] });
  }
}

let ctx; let server; let base; let port;
const origin = () => `http://localhost:${port}`;
const J = () => ({ 'content-type': 'application/json', origin: origin() });
const get = async (path) => (await fetch(`${base}${path}`)).json();
const send = (method, path, body) => fetch(`${base}${path}`, { method, headers: J(), body: JSON.stringify(body) });
async function readSse(res) {
  const text = await res.text();
  return text.split('\n\n').filter(Boolean).map((f) => ({ event: /^event: (.*)$/m.exec(f)?.[1], data: JSON.parse(/^data: (.*)$/m.exec(f)?.[1] ?? 'null') }));
}

before(async () => {
  makeBook('alpha', { title: 'Alpha', order: 2, hue: 40, tutor: { name: 'Alpha Academy', about: 'a course about alphas', examples: 'a-things', learnerRole: 'alphanaut', mentorRole: 'an alpha mentor' } });
  makeBook('beta', { title: 'Beta', order: 1, hue: 300, roleplay: true, tutor: { name: 'Beta School', about: 'a course about betas' } });
  write(join(BOOKS, 'broken', 'book.json'), '{ not json');
  write(join(BOOKS, 'broken', 'syllabus.json'), '{}');
  mkdirSync(join(BOOKS, '_hidden'), { recursive: true });
  write(join(BOOKS, '_hidden', 'book.json'), { title: 'Hidden' });
  write(join(BOOKS, '.dot', 'book.json'), { title: 'Dot' });
  write(join(BOOKS, 'package.json'), '{}');
  const config = loadConfig({}, { booksDir: BOOKS, defaultBook: 'alpha', dataDir: DATA, silent: true, limits: { chatPerMinute: 100, dailyTokens: 10_000_000 }, deepseek: { key: process.env.DEEPSEEK_API_KEY, baseUrl: fake.url, model: 'deepseek-flash' } });
  ctx = await createContext(config);
  server = createApp(ctx).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  port = server.address().port;
  base = `http://localhost:${port}`;
});

after(async () => {
  server.close();
  await ctx.store.close();
  await fake.close?.();
  rmSync(TMP, { recursive: true, force: true });
});

describe('the library', () => {
  test('lists real books in order, hides folders that are not books, and survives a broken one', async () => {
    const lib = await get('/api/books');
    assert.deepEqual(lib.books.map((b) => b.slug), ['beta', 'alpha'], 'ordered by `order`, then title');
    assert.equal(lib.default, 'alpha');
    const beta = lib.books[0];
    assert.equal(beta.title, 'Beta');
    assert.equal(beta.hue, 300);
    assert.equal(beta.pages, 2);
    assert.equal(beta.authored, 2);
    assert.equal(beta.done, 0);
    assert.equal(lib.books.some((b) => ['broken', '_hidden', '.dot', 'package.json'].includes(b.slug)), false);
    assert.match(ctx.library.problems.get('broken'), /./, 'the broken book is reported, not fatal');
  });

  test('every book answers on its own URL, and the same page id means different pages', async () => {
    const a = await get('/api/books/alpha/topic/c01-t01');
    const b = await get('/api/books/beta/topic/c01-t01');
    assert.equal(a.title, 'Alpha: page one');
    assert.equal(b.title, 'Beta: page one');
    assert.equal(a.book.slug, 'alpha');
    assert.equal((await get('/api/books/beta/book')).book.title, 'Beta');
  });

  test('the original single-book URLs mean the default book', async () => {
    assert.equal((await get('/api/topic/c01-t01')).title, 'Alpha: page one');
    assert.equal((await get('/api/book')).book.slug, 'alpha');
    assert.equal((await fetch(`${base}/api/topic/c99-t99`)).status, 404);
  });

  test('odd book names never reach the file system', async () => {
    // fetch() would tidy "../" away before sending, so these go over a raw socket exactly as written
    const raw = (path) => new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path, headers: { host: `localhost:${port}` } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }).on('error', reject);
    });
    for (const bad of ['nope', 'Alpha', '..', '%2e%2e', '..%2F..%2Fetc', '%2e%2e%2f%2e%2e%2fetc', '.dot', '_hidden', 'broken', 'a'.repeat(60), 'alpha%00', '__proto__', 'constructor', 'alpha%20', 'a.b']) {
      const res = await raw(`/api/books/${bad}/book`);
      assert.equal(res.status, 404, `${bad} must be 404, got ${res.status}`);
      assert.equal(JSON.parse(res.body).error.code, 'unknown_book');
    }
  });

  test('role-play secrets stay server-side in every book', async () => {
    const t = await fetch(`${base}/api/books/beta/topic/c01-t02`);
    const text = await t.text();
    assert.equal(text.includes('SECRET-PERSONA'), false);
    assert.equal(JSON.parse(text).hasRoleplay, true);
  });

  test('a symlink inside a book cannot read files outside its code folder', async () => {
    const outside = join(TMP, 'outside-secrets');
    write(join(outside, 'secret.txt'), 'TOP-SECRET-OUTSIDE');
    makeBook('linked', { title: 'Linked', order: 9 });
    const bdir = join(BOOKS, 'linked');
    write(join(bdir, 'c01', 'c01-t01.json'), { title: 'Linked page', idea: 'x', points: ['a', 'b', 'c'], takeaway: 'ok', code: [{ file: 'secret.txt', lang: 'text', run: 'static' }, { file: 'fine.txt', lang: 'text', run: 'static' }] });
    write(join(bdir, 'code', 'real', 'fine.txt'), 'fine text');
    symlinkSync(outside, join(bdir, 'code', 'c01-t01'));
    await new Promise((r) => setTimeout(r, 2200));
    const t = await get('/api/books/linked/topic/c01-t01');
    assert.ok(t.code.every((c) => c.missing && c.source === ''), 'nothing is read through the link');
    assert.equal(JSON.stringify(t).includes('TOP-SECRET-OUTSIDE'), false);
  });

  test('a book added while the server runs shows up on its own', async () => {
    makeBook('gamma', { title: 'Gamma', order: 3 });
    await new Promise((r) => setTimeout(r, 2200));
    assert.ok((await get('/api/books')).books.some((b) => b.slug === 'gamma'));
    assert.equal((await get('/api/books/gamma/topic/c01-t01')).title, 'Gamma: page one');
  });
});

describe('what you save stays inside its book', () => {
  test('progress and notes are per book, in data/books/<slug>/', async () => {
    await send('PATCH', '/api/books/alpha/progress/c01-t01', { visited: true, done: true, frame: 2 });
    const a = await get('/api/books/alpha/progress');
    const b = await get('/api/books/beta/progress');
    assert.ok(a.topics['c01-t01'].done);
    assert.equal(b.topics['c01-t01'], undefined, 'the same page id in another book is untouched');
    await send('PUT', '/api/books/alpha/notes/c01-t01', { text: 'alpha note', rev: 0 });
    assert.equal((await get('/api/books/alpha/notes/c01-t01')).text, 'alpha note');
    assert.equal((await get('/api/books/beta/notes/c01-t01')).text, '');
    assert.ok(existsSync(join(DATA, 'books', 'alpha', 'progress.json')));
    assert.ok(existsSync(join(DATA, 'books', 'alpha', 'notes', 'c01-t01.json')));
    assert.equal(existsSync(join(DATA, 'books', 'beta', 'notes')), false);
    const lib = await get('/api/books');
    const card = lib.books.find((x) => x.slug === 'alpha');
    assert.equal(card.done, 1);
    assert.equal(card.last.id, 'c01-t01');
    assert.equal(card.last.title, 'Alpha: page one');
  });

  test('chats are per book, and each book speaks with its own tutor', async () => {
    const ask = (slug, text) => send('POST', `/api/books/${slug}/chat`, { topicId: 'c01-t01', clientMsgId: `m-${slug}-${text.length}-abcdef`, message: text, mode: 'ask' });
    await readSse(await ask('alpha', 'what is an alpha?'));
    const sentAlpha = fake.requests.at(-1).body.messages[0].content;
    assert.match(sentAlpha, /in-page tutor of "Alpha Academy", a course about alphas\./);
    assert.match(sentAlpha, /Prefer one concrete example \(a-things\) over abstract prose/);
    assert.match(sentAlpha, /An idea from Alpha\./);
    await readSse(await ask('beta', 'what is a beta?'));
    const sentBeta = fake.requests.at(-1).body.messages[0].content;
    assert.match(sentBeta, /in-page tutor of "Beta School", a course about betas\./);
    assert.equal(sentBeta.includes('Alpha'), false, 'nothing from the other book reaches the prompt');
    assert.equal((await get('/api/books/alpha/chats')).threads.length, 1);
    assert.equal((await get('/api/books/beta/chats')).threads.length, 1);
    assert.equal((await get('/api/books/alpha/chats?q=beta')).threads.length, 0, 'search stays inside the book');
    assert.ok(existsSync(join(DATA, 'books', 'alpha', 'chats', 'c01-t01.json')));
    assert.ok(existsSync(join(DATA, 'books', 'beta', 'chats', 'c01-t01.json')));
    const exp = await fetch(`${base}/api/books/beta/chats/export`);
    assert.match(exp.headers.get('content-disposition'), /beta-chats-all\.md/);
    assert.match(await exp.text(), /^# Beta — saved chats/);
  });

  test('a book that does not exist cannot receive a chat', async () => {
    const res = await send('POST', '/api/books/nope/chat', { topicId: 'c01-t01', clientMsgId: 'm-nope-abcdef', message: 'hi', mode: 'ask' });
    assert.equal(res.status, 404);
  });
});

describe('moving the original single-book data', () => {
  const cfg = (dir, extra = {}) => loadConfig({}, { booksDir: BOOKS, defaultBook: 'alpha', dataDir: dir, silent: true, ...extra });
  const legacy = (dir) => {
    write(join(dir, 'chats', 'c01-t01.json'), { v: 1, topicId: 'c01-t01', threads: [{ id: 't_aaaaaaaa', title: 'old chat', messages: [] }] });
    write(join(dir, 'chats', 'c01-t01.json.bak'), '{"v":1}');
    write(join(dir, 'notes', 'c01-t01.json'), { text: 'old note', rev: 3 });
    write(join(dir, 'progress.json'), { v: 1, topics: { 'c01-t01': { visited: 1, done: 2 } }, last: null });
    write(join(dir, 'usage.json'), { day: '2026-10-01', tokens: 5 });
  };

  test('copies, verifies, snapshots, then removes the originals; a second run does nothing', async () => {
    const dir = join(TMP, 'legacy-ok');
    legacy(dir);
    const before = readFileSync(join(dir, 'chats', 'c01-t01.json'), 'utf8');
    const r = await migrateLegacyData({ config: cfg(dir) });
    assert.equal(r.migrated, true);
    assert.equal(r.files, 4);
    assert.equal(readFileSync(join(dir, 'books', 'alpha', 'chats', 'c01-t01.json'), 'utf8'), before, 'byte for byte');
    assert.equal(JSON.parse(readFileSync(join(dir, 'books', 'alpha', 'notes', 'c01-t01.json'), 'utf8')).text, 'old note');
    assert.ok(existsSync(join(dir, 'books', 'alpha', '.migrated')));
    assert.ok(existsSync(join(r.backup, 'chats', 'c01-t01.json')), 'a snapshot was kept');
    for (const gone of ['chats', 'notes', 'progress.json']) assert.equal(existsSync(join(dir, gone)), false, `${gone} moved`);
    assert.ok(existsSync(join(dir, 'usage.json')), 'the global usage counter stays put');
    assert.equal((await migrateLegacyData({ config: cfg(dir) })).migrated, false);
  });

  test('does nothing when the default book is not installed, or when there is no old data', async () => {
    const dir = join(TMP, 'legacy-nobook');
    legacy(dir);
    const r = await migrateLegacyData({ config: cfg(dir, { defaultBook: 'missing' }) });
    assert.equal(r.migrated, false);
    assert.ok(existsSync(join(dir, 'chats', 'c01-t01.json')), 'untouched');
    assert.equal((await migrateLegacyData({ config: cfg(join(TMP, 'legacy-empty')) })).migrated, false);
  });

  test('refuses to overwrite data that is already in the new place', async () => {
    const dir = join(TMP, 'legacy-conflict');
    legacy(dir);
    write(join(dir, 'books', 'alpha', 'notes', 'x.json'), { text: 'already here' });
    const r = await migrateLegacyData({ config: cfg(dir) });
    assert.equal(r.migrated, false);
    assert.ok(existsSync(join(dir, 'chats', 'c01-t01.json')), 'old data kept');
    assert.equal(JSON.parse(readFileSync(join(dir, 'books', 'alpha', 'notes', 'x.json'), 'utf8')).text, 'already here');
  });

  test('a migration that was killed half way is simply done again, and no half-copy is ever in the real place', async () => {
    const dir = join(TMP, 'legacy-interrupted');
    legacy(dir);
    // what a crash leaves behind: a staging folder with some of the files, and nothing at the real address
    write(join(dir, 'books', '.alpha.migrating', 'chats', 'c01-t01.json'), '{"partial":true}');
    assert.equal(existsSync(join(dir, 'books', 'alpha')), false);
    const r = await migrateLegacyData({ config: cfg(dir) });
    assert.equal(r.migrated, true);
    assert.equal(r.files, 4);
    assert.equal(JSON.parse(readFileSync(join(dir, 'books', 'alpha', 'chats', 'c01-t01.json'), 'utf8')).topicId, 'c01-t01', 'the full file, not the partial one');
    assert.equal(JSON.parse(readFileSync(join(dir, 'books', 'alpha', 'notes', 'c01-t01.json'), 'utf8')).text, 'old note');
    assert.equal(existsSync(join(dir, 'books', '.alpha.migrating')), false, 'the staging folder is gone');
    assert.ok(existsSync(join(dir, 'books', 'alpha', '.migrated')));
  });

  test('a failure leaves the originals exactly as they were', async () => {
    const dir = join(TMP, 'legacy-fail');
    legacy(dir);
    mkdirSync(join(dir, 'books'), { recursive: true });
    chmodSync(join(dir, 'books'), 0o500); // read-only: creating the new book folder fails part-way
    try {
      await assert.rejects(() => migrateLegacyData({ config: cfg(dir) }), /Nothing was changed/);
    } finally {
      chmodSync(join(dir, 'books'), 0o700);
    }
    assert.equal(JSON.parse(readFileSync(join(dir, 'notes', 'c01-t01.json'), 'utf8')).text, 'old note');
    assert.equal(readdirSync(join(dir, 'chats')).length, 2);
    assert.equal(existsSync(join(dir, 'books', 'alpha')), false, 'no half-written copy is left behind');
  });
});
