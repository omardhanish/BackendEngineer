// Browser checks for the library: cover shelf, book switcher, per-book URLs, old-URL redirects, per-book saved data.
// Runs a throwaway server on port 4011 with its own books folder (a copy of the real default book plus a tiny second book
// that deliberately reuses its page ids) and its own data folder. Never touches the real server or the real data.
//   node tools/e2e-library.mjs
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4011;
const BASE = `http://localhost:${PORT}`;
const BOOKS = join(root, '.tmp', 'ui-books');
const DATA = join(root, '.tmp', 'ui-data');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
const fails = [];
const check = (name, ok, detail = '') => { if (ok) { pass++; console.log(`  ✔ ${name}`); } else { fails.push(name); console.log(`  ✖ ${name}${detail ? `\n      ${detail}` : ''}`); } };
const section = (t) => console.log(`\n${t}`);

// ---- fixture library
rmSync(BOOKS, { recursive: true, force: true });
rmSync(DATA, { recursive: true, force: true });
mkdirSync(BOOKS, { recursive: true });
mkdirSync(DATA, { recursive: true });
const DEFAULT = 'backend-engineer';
cpSync(join(root, 'content', 'books', DEFAULT), join(BOOKS, DEFAULT), { recursive: true });
const zen = join(BOOKS, 'zen-garden');
mkdirSync(join(zen, 'c01'), { recursive: true });
mkdirSync(join(zen, 'c02'), { recursive: true });
const put = (p, d) => writeFileSync(p, `${JSON.stringify(d, null, 2)}\n`);
put(join(zen, 'book.json'), { slug: 'zen-garden', title: 'Zen Garden', tagline: 'Raking gravel, thinking clearly.', hue: 150, order: 20, profile: 'none', monogram: 'ZG', tutor: { name: 'Zen Garden', about: 'a calm course about gardens' } });
put(join(zen, 'syllabus.json'), {
  version: 1,
  chapters: [
    { id: 'c01', n: 1, title: 'Gravel', tagline: 'Lines in the sand.', outcomes: ['Rake a line'], hue: 150, topics: ['c01-t01', 'c01-t02'] },
    { id: 'c02', n: 2, title: 'Stones', tagline: 'Where to put them.', outcomes: ['Place a stone'], hue: 200, topics: ['c02-t01'] },
  ],
  topics: [
    { id: 'c01-t01', chapter: 'c01', n: 1, kind: 'lecture', depth: 1, source: 'Raking' },
    { id: 'c01-t02', chapter: 'c01', n: 2, kind: 'lecture', depth: 1, source: 'Patterns' },
    { id: 'c02-t01', chapter: 'c02', n: 1, kind: 'lecture', depth: 1, source: 'Placing a stone' },
  ],
});
put(join(zen, 'c01', 'c01-t01.json'), { title: 'Raking the gravel', idea: 'Gravel is raked in straight lines to calm the mind.', points: ['Hold the rake low', 'Pull, do not push', 'Overlap each line'], takeaway: 'Slow and straight.' });

// a page with real Python: checks the language label, the highlighting and the replay of a recorded run
mkdirSync(join(zen, 'code', 'c01-t02'), { recursive: true });
writeFileSync(join(zen, 'code', 'c01-t02', 'rake.py'), 'def rake(lines):\n    return [\'~\' * 8 for _ in range(lines)]\n\nprint(\'\\n\'.join(rake(2)))\n');
put(join(zen, 'code', 'c01-t02', 'rake.py.out.json'), { stdout: '~~~~~~~~\n~~~~~~~~', stderr: '', code: 0, node: null, runner: 'python', command: 'python3 rake.py', tool: 'Python 3.14.0', hash: 'x', at: '2026-01-01T00:00:00.000Z' });
put(join(zen, 'c01', 'c01-t02.json'), { title: 'Raking in Python', idea: 'A tiny rake, written in Python.', points: ['a list', 'a loop', 'a print'], takeaway: 'Code can rake too.', code: [{ file: 'rake.py', lang: 'python', run: 'captured', caption: 'Two lines of gravel' }] });

const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(PORT), DATA_DIR: '.tmp/ui-data', BOOKS_DIR: '.tmp/ui-books', DEFAULT_BOOK: DEFAULT, DEEPSEEK_API_KEY: 'sk-test-not-used', LOG: 'silent' }, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));
for (let i = 0; i < 40; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch { /* starting */ } await sleep(250); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/api\/chat|Failed to load resource/.test(m.text())) pageErrors.push(m.text()); });
const path = () => new URL(page.url()).pathname + new URL(page.url()).search;
const text = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
const count = (sel) => page.$$eval(sel, (l) => l.length);
const go = async (p, ready) => { await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle0' }); await page.waitForSelector(ready, { timeout: 8000 }); await sleep(250); };
const waitPath = async (p) => { for (let i = 0; i < 40 && path() !== p; i++) await sleep(100); await sleep(250); };
const vis = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }).catch(() => false);
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

try {
  section('The library');
  await go('/', '.lib-shelf');
  check('Two covers and an "Add a book" card', (await count('.lib-card')) === 3 && (await count('.lib-card:not(.lib-add)')) === 2);
  check('Covers carry their own hue', await page.$$eval('.lib-card:not(.lib-add)', (l) => new Set(l.map((e) => e.style.getPropertyValue('--h'))).size === 2));
  check('Cover shows title and tagline', (await page.$$eval('.lib-title', (l) => l.map((e) => e.textContent))).some((t) => t.includes('Zen Garden')) && (await text('.lib-tag')) !== null);
  check('Tab title names the library', (await page.title()) === 'Living library');
  check('The add-a-book card names the command', (await text('.lib-add .lib-cmd code')) === '/786createbook');
  check('The contents lists the books, not chapters', (await count('.toc-book')) === 2 && (await count('.toc-ch')) === 0);
  check('The page filter and chat link are hidden in the library', !(await vis('.toc-search')) && !(await vis('.toc-chats')));

  section('Opening a book from its cover');
  await page.click('.lib-card[data-slug="zen-garden"] .lib-main');
  await waitPath('/b/zen-garden');
  check('URL is /b/zen-garden', path() === '/b/zen-garden');
  check('The book home shows its title', (await text('.home-title')) === 'Zen Garden');
  check('The contents shows that book\'s chapters', (await count('.toc-ch')) === 2 && (await text('.toc-ch-title')) === 'Gravel');
  check('The switcher shows the current book', (await text('.bk-name')) === 'Zen Garden');
  check('Crumbs lead back to the library', (await page.$$eval('.crumb', (l) => l.map((e) => e.textContent))).join('|') === 'Library|Zen Garden');
  check('Tab title is "<book> · Living library"', (await page.title()) === 'Zen Garden · Living library');
  check('The page uses the book\'s hue', (await page.evaluate(() => document.documentElement.style.getPropertyValue('--h'))) === '150');
  check('The top-bar mark is the book\'s monogram', (await text('.tb-brand')) === 'ZG');

  section('Reading a page and saving things per book');
  await page.click('.book-card[href="/b/zen-garden/c/c01"]');
  await waitPath('/b/zen-garden/c/c01');
  check('A chapter opens under /b/zen-garden/c/…', path() === '/b/zen-garden/c/c01' && (await text('.cover-title')) === 'Gravel');
  await page.click('.ch-row[href="/b/zen-garden/read/c01-t01"]');
  await waitPath('/b/zen-garden/read/c01-t01');
  await page.waitForSelector('.stage-body .frame', { timeout: 8000 });
  check('Page opens under /b/zen-garden/read/…', path() === '/b/zen-garden/read/c01-t01');
  check('Page content comes from the Zen book', (await text('.f-title, .frame h1')) === 'Raking the gravel');
  await sleep(900);
  check('Progress is saved under that book only', !!readJson(join(DATA, 'books', 'zen-garden', 'progress.json'))?.topics?.['c01-t01']?.visited && !readJson(join(DATA, 'books', DEFAULT, 'progress.json'))?.topics?.['c01-t01']);
  await page.keyboard.press('n');
  await sleep(500);
  await page.type('.notes-ta', 'zen note');
  await sleep(1500);
  check('Notes are saved under that book only', existsSync(join(DATA, 'books', 'zen-garden', 'notes')) && !existsSync(join(DATA, 'books', DEFAULT, 'notes')));
  check('The tutor dock is aimed at this book', (await page.$eval('.dock-inner', (e) => e.textContent)).includes('Raking the gravel'));

  section('Code in another language');
  await page.goto(`${BASE}/b/zen-garden/read/c01-t02/3`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.codewin', { timeout: 8000 }).catch(() => {});
  await sleep(300);
  check('The code window is labelled Python', (await text('.cw-lang')) === 'Python');
  check('Python is syntax-highlighted', (await count('.codewin .token')) > 3);
  await page.click('.btn-run');
  await sleep(1200);
  const outText = await page.$eval('.codewin', (e) => e.parentElement.textContent).catch(() => '');
  check('Run replays the recorded command and output', outText.includes('$ python3 rake.py') && outText.includes('~~~~~~~~'), outText.slice(-200));
  check('The real toolchain version is shown', outText.includes('Python 3.14'));

  section('Switching books');
  await page.keyboard.press('Escape');
  await page.keyboard.press('b');
  await sleep(500);
  check('B opens the book switcher', await vis('.bk-menu'));
  await page.click(`.bk-menu .bk-item[href="/b/${DEFAULT}"]`);
  await waitPath(`/b/${DEFAULT}`);
  await page.waitForSelector('.home-title', { timeout: 8000 });
  check('Switching lands on the other book', path() === `/b/${DEFAULT}` && (await text('.home-title')).includes('Backend'));
  check('The contents now shows 13+ chapters of that book', (await count('.toc-ch')) > 10);
  check('Its notes dock is empty of the other book\'s page', !(await page.$eval('.dock-inner', (e) => e.textContent)).includes('Raking'));
  check('Its progress does not include the Zen page', !(await page.evaluate(() => document.querySelector('.stat b')?.textContent === '1')));

  section('The original URLs still work');
  await go('/read/c01-t01', '.stage-body .frame');
  check('/read/… becomes /b/<default>/read/…', path() === `/b/${DEFAULT}/read/c01-t01`, path());
  await go('/c/c02', '.cover');
  check('/c/… becomes /b/<default>/c/…', path() === `/b/${DEFAULT}/c/c02`, path());
  await go('/chats', '.history');
  check('/chats becomes /b/<default>/chats', path() === `/b/${DEFAULT}/chats`, path());

  section('Not found');
  await go('/b/no-such-book', '.empty-state');
  check('An unknown book says so and links home', (await text('.empty-state h1')) === 'No such book' && (await page.$eval('.empty-state a', (a) => a.getAttribute('href'))) === '/');
  await go('/b/%zz', '.empty-state');
  check('A malformed address is "not found", not a blank page', (await text('.empty-state h1')) !== null);
  await go('/b/zen-garden/read/c09-t99', '.empty-state');
  check('An unknown page in a real book says so', (await text('.empty-state h1')) === 'No such page');

  section('Search (⌘K)');
  await go('/', '.lib-shelf');
  await page.keyboard.down('Meta'); await page.keyboard.press('k'); await page.keyboard.up('Meta');
  await sleep(400);
  check('The palette lists the books in the library', (await page.$$eval('.pal-item .pal-label', (l) => l.map((e) => e.textContent))).includes('Zen Garden'));
  await page.type('.pal-input', 'zen');
  await sleep(300);
  await page.keyboard.press('Enter');
  await waitPath('/b/zen-garden');
  check('Choosing a book in the palette opens it', path() === '/b/zen-garden');
  await page.keyboard.down('Meta'); await page.keyboard.press('k'); await page.keyboard.up('Meta');
  await sleep(300);
  await page.type('.pal-input', 'placing');
  await sleep(300);
  await page.keyboard.press('Enter');
  await waitPath('/b/zen-garden/read/c02-t01');
  check('Pages of the current book are searchable', path() === '/b/zen-garden/read/c02-t01');
  check('A page that is not written yet says so, with a link back', (await text('.frame-soon .f-idea')) === 'This page is still being written.' && (await page.$eval('.frame-soon a.btn', (a) => a.getAttribute('href'))) === '/b/zen-garden/c/c02');

  section('A phone');
  const phone = await browser.newPage();
  await phone.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  phone.on('pageerror', (e) => pageErrors.push(e.message));
  await phone.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await phone.waitForSelector('.lib-shelf');
  await sleep(300);
  check('The library does not scroll sideways', await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('Covers stack in one column', await phone.$$eval('.lib-card', (l) => new Set(l.map((e) => Math.round(e.getBoundingClientRect().left))).size === 1));
  await phone.goto(`${BASE}/b/zen-garden/read/c01-t01`, { waitUntil: 'networkidle0' });
  await phone.waitForSelector('.stage-body .frame');
  check('A page does not scroll sideways', await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await phone.click('.tb-menu');
  await sleep(400);
  check('The contents sheet shows the switcher', await phone.$eval('.bk-switch', (e) => e.getBoundingClientRect().width > 0));
  await phone.close();

  section('Console');
  check('No page errors', pageErrors.length === 0, pageErrors.join(' | '));
} catch (e) {
  // a thrown error (missing element, timeout) is a failure too: keep a screenshot to look at
  fails.push(`crashed: ${e.message.split('\n')[0]}`);
  console.log(`\n  ✖ ${e.message.split('\n')[0]}  (at ${path()})`);
  if (pageErrors.length) console.log(`  page errors: ${pageErrors.join(' | ')}`);
  await page.screenshot({ path: join(root, '.tmp', 'ui-crash.png') }).catch(() => {});
} finally {
  await browser.close();
  server.kill('SIGTERM');
  await sleep(400);
  rmSync(BOOKS, { recursive: true, force: true });
  rmSync(DATA, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fails.length} failed${fails.length ? `: ${fails.join('; ')}` : ''}`);
if (fails.length && serverLog.trim()) console.log(`\nserver output:\n${serverLog.trim().slice(-800)}`);
process.exit(fails.length ? 1 : 0);
