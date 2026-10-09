// Visual QA with the Chrome already on this Mac (puppeteer-core, no browser download).
// Screenshots go to qa/shots/. Fails the page on: console errors, failed requests, a frame that scrolls at
// 1280×720, or fonts that did not load. I read the images myself.
//   node tools/qa-shots.mjs                       default pilot set, light, 1440×900
//   node tools/qa-shots.mjs --themes light,dark --sizes 1440x900,1280x720,390x844
//   node tools/qa-shots.mjs --only c02-t09        only shots whose name contains this
//   node tools/qa-shots.mjs --book my-book --auto  every frame of every written page of another book (default book: backend-engineer)
//   node tools/qa-shots.mjs --only library        the library page itself
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// By default QA runs against its OWN throwaway server (separate port and data folder), so visiting every page never
// marks pages as read in your real progress. Set BASE=http://localhost:4000 to look at your running book instead.
import { spawn } from 'node:child_process';
const OWN_PORT = Number(process.env.QA_PORT) || 4012; // set QA_PORT to run several sweeps side by side
const BASE = process.env.BASE || `http://localhost:${OWN_PORT}`;
let ownServer = null;
if (!process.env.BASE) {
  ownServer = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(OWN_PORT), DATA_DIR: `.tmp/qa-data-${OWN_PORT}`, LOG: 'silent' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch { /* still starting */ } await new Promise((r) => setTimeout(r, 250)); }
  process.on('exit', () => ownServer.kill());
}
const OUT = join(root, 'qa', 'shots');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? def : process.argv[i + 1]; };
const themes = arg('themes', 'light').split(',');
const sizes = arg('sizes', '1440x900').split(',').map((s) => s.split('x').map(Number));
const only = arg('only', '');
const auto = process.argv.includes('--auto');
const fromId = arg('from', ''); // resume an --auto sweep at this page id (e.g. --from c06-t08)
const checkOnly = process.argv.includes('--check-only'); // run every check but skip the screenshots (fast sweep of all pages)

const BOOK = arg('book', 'backend-engineer');
const bp = (p) => (p.startsWith('//') ? p.slice(1) : `/b/${BOOK}${p === '/' ? '' : p}`); // book-relative path -> URL ('//x' = absolute)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const press = (n, key = 'ArrowRight') => ['press', key, n];

// name → { path, actions }
const SHOTS = [
  { name: 'home', path: '/' },
  { name: 'chapter-c02', path: '/c/c02' },
  { name: 'c00-t01-f1', path: '/read/c00-t01' },
  { name: 'c00-t01-f2', path: '/read/c00-t01/2', actions: [press(2)] },
  { name: 'c01-t02-f1', path: '/read/c01-t02' },
  { name: 'c01-t02-f2-step3', path: '/read/c01-t02/2', actions: [press(3), ['wait', 700]] },
  { name: 'c01-t02-f3', path: '/read/c01-t02/3' },
  { name: 'c01-t02-f3-run', path: '/read/c01-t02/3', actions: [['click', '.btn-run'], ['wait', 900]] },
  { name: 'c01-t02-f4', path: '/read/c01-t02/4' },
  { name: 'c02-t09-f1', path: '/read/c02-t09' },
  { name: 'c02-t09-f2-step0', path: '/read/c02-t09/2' },
  { name: 'c02-t09-f2-step6', path: '/read/c02-t09/2', actions: [press(6), ['wait', 800]] },
  { name: 'c02-t09-f3', path: '/read/c02-t09/3' },
  { name: 'c02-t09-f3-captured', path: '/read/c02-t09/3', actions: [['click', '.tab:nth-child(2)'], ['wait', 300], ['click', '.btn-run'], ['wait', 900]] },
  { name: 'c02-t09-f4', path: '/read/c02-t09/4' },
  { name: 'c02-t11-f2-step1', path: '/read/c02-t11/2', actions: [press(1), ['wait', 500]] },
  { name: 'c02-t11-f3-run', path: '/read/c02-t11/3', actions: [['click', '.btn-run'], ['wait', 900]] },
  { name: 'c04-t08-f2-step2', path: '/read/c04-t08/2', actions: [press(2), ['wait', 800]] },
  { name: 'c04-t08-f2-step9', path: '/read/c04-t08/2', actions: [press(9), ['wait', 800]] },
  { name: 'c04-t08-f3-run', path: '/read/c04-t08/3', actions: [['click', '.btn-run'], ['wait', 900]] },
  { name: 'c04-t07-f1', path: '/read/c04-t07' },
  { name: 'c04-t07-f2', path: '/read/c04-t07/2' },
  { name: 'c04-t07-f3', path: '/read/c04-t07/3' },
  { name: 'c09-t10-f2', path: '/read/c09-t10/2' },
  { name: 'c09-t10-f3-walk', path: '/read/c09-t10/3', actions: [press(3), ['wait', 400]] },
  { name: 'c09-t10-end', path: '/read/c09-t10/5' },
  { name: 'soon-c05-t03', path: '/read/c05-t03' },
  { name: 'chats', path: '/chats' },
  { name: 'library', path: '//' },
];

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const report = [];
let failed = 0;

for (const theme of themes) {
  for (const [w, h] of sizes) {
    let page = await browser.newPage();
    let recreate = false; // a lost tab (sleep, crash) must not poison every later frame
    const problems = [];
    const wire = (pg) => {
      pg.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
      pg.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      pg.on('requestfailed', (r) => { if (!r.url().includes('/api/chat')) problems.push(`request failed: ${r.url()}`); });
    };
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    wire(page);

    let shots = BOOK === 'backend-engineer' ? SHOTS : SHOTS.filter((x) => ['home', 'chats', 'library'].includes(x.name)); // the curated pilot list names pages of the default book
    if (auto) {
      // every frame of every written page, plus the middle step of any animation
      const book = await (await fetch(`${BASE}/api/books/${BOOK}/book`)).json();
      shots = [];
      for (const t of book.topics.filter((x) => x.authored && (!fromId || x.id >= fromId) && (!only || x.id.includes(only)))) {
        await page.goto(`${BASE}${bp(`/read/${t.id}`)}`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('.stage-body .frame', { timeout: 8000 }).catch(() => {});
        const frames = await page.$$eval('.deck-dot', (d) => d.length);
        for (let f = 1; f <= Math.max(1, frames); f++) {
          shots.push({ name: `${t.id}-f${f}`, path: `/read/${t.id}/${f}`, mid: true });
        }
      }
    }
    for (const shot of shots) {
      if (only && !shot.name.includes(only)) continue;
      if (page.isClosed() || recreate) { recreate = false; await page.close().catch(() => {}); page = await browser.newPage(); await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 }); await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]); wire(page); }
      problems.length = 0;
      try { await page.goto(`${BASE}${bp(shot.path)}`, { waitUntil: 'networkidle0', timeout: 30000 }); } catch (e) { recreate = true; problems.push(`navigation failed: ${e.message.split('\n')[0]}`); report.push({ file: `${shot.name}__${theme}__${w}x${h}`, ok: false, problems: [...problems] }); failed++; console.log(`✖ ${shot.name} ${theme} ${w}x${h}\n    ${problems.join('\n    ')}`); continue; }
      let stats = { overflow: 0 };
      try {
        await page.waitForSelector('.stage-body .frame, .home, .cover, .history, .empty-state', { timeout: 8000 }).catch(() => problems.push('page did not render'));
        await page.evaluate(() => document.activeElement?.blur?.());
        await sleep(350);
        if (shot.mid) {
          const total = await page.$eval('.fig-step', (e) => Number(e.textContent.split('/')[1])).catch(() => 0);
          if (total > 2) shot.actions = [press(Math.floor(total / 2)), ['wait', 700]];
        }
        for (const [kind, a, b] of shot.actions || []) {
          if (kind === 'press') { for (let i = 0; i < b; i++) { await page.keyboard.press(a); await sleep(120); } }
          else if (kind === 'click') await page.click(a).catch(() => problems.push(`could not click ${a}`));
          else if (kind === 'wait') await sleep(a);
        }
        await sleep(250);
        stats = await page.evaluate(() => {
          const body = document.querySelector('.stage-body');
          return {
            overflow: body ? body.scrollHeight - body.clientHeight : 0,
            fonts: document.fonts.check('16px Newsreader') && document.fonts.check('14px Inter'),
            htmlOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
            workspace: !!document.querySelector('.frame-challenges'),
          };
        });
        if (stats.overflow > 1 && w >= 1280 && !stats.workspace) problems.push(`frame scrolls by ${stats.overflow}px`);
        if (!stats.fonts) problems.push('fonts not loaded');
        if (stats.htmlOverflowX) problems.push('page overflows horizontally');
      } catch (e) { recreate = true; problems.push(`browser error: ${e.message.split('\n')[0]}`); }
      const file = `${shot.name}__${theme}__${w}x${h}.png`;
      if (!checkOnly) await page.screenshot({ path: join(OUT, file) }).catch(() => problems.push('screenshot failed'));
      const ok = problems.length === 0;
      if (!ok) failed++;
      report.push({ file, ok, problems: [...problems], overflow: stats.overflow });
      console.log(`${ok ? '✔' : '✖'} ${file}${ok ? '' : `\n    ${problems.join('\n    ')}`}`);
    }
    await page.close();
  }
}
await browser.close();
writeFileSync(join(root, 'qa', 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n${report.length - failed}/${report.length} shots clean → qa/shots`);
process.exit(failed ? 1 : 0);
