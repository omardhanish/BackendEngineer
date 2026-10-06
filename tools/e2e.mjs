// End-to-end checks in a real browser (puppeteer-core + the Chrome on this Mac) against a throwaway server
// on port 4010 with its own data dir. Includes the in-browser-runner vs real-Node parity check.
//   node tools/e2e.mjs            everything (makes 3 short real DeepSeek calls)
//   node tools/e2e.mjs --no-chat  skip the checks that call DeepSeek
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4010;
const BASE = `http://localhost:${PORT}`;
const DATA = join(root, '.tmp', 'e2e-data');
const skipChat = process.argv.includes('--no-chat');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
const fails = [];
const check = (name, ok, detail = '') => { if (ok) { pass++; console.log(`  ✔ ${name}`); } else { fails.push(name); console.log(`  ✖ ${name}${detail ? `\n      ${detail}` : ''}`); } };
const section = (t) => console.log(`\n${t}`);

rmSync(DATA, { recursive: true, force: true });
mkdirSync(DATA, { recursive: true });
const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(PORT), DATA_DIR: '.tmp/e2e-data', LOG: 'silent' }, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));
for (let i = 0; i < 40; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch { /* starting */ } await sleep(250); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/api\/chat/.test(m.text())) pageErrors.push(m.text()); });
const text = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
const go = async (path, ready = '.stage-body .frame, .home, .cover') => { await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' }); await page.waitForSelector(ready, { timeout: 8000 }); await sleep(250); };
const press = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(140); } await sleep(300); };

try {
  // ------------------------------------------------------------------ runner parity
  section('In-browser runner prints exactly what real Node printed');
  await go('/');
  const ids = (await (await fetch(`${BASE}/api/book`)).json()).topics.filter((t) => t.authored).map((t) => t.id);
  const snippets = [];
  for (const id of ids) {
    const t = await (await fetch(`${BASE}/api/topic/${id}`)).json();
    for (const c of t.code || []) if (c.run === 'browser' && c.captured) snippets.push({ id, file: c.file, source: c.source, expect: c.captured.stdout });
  }
  const ran = await page.evaluate(async (list) => {
    const { runCode } = await import('/js/runner-host.js');
    const out = [];
    for (const sn of list) {
      const lines = [];
      const end = await new Promise((resolve) => { runCode(sn.source, { onOut: (m) => lines.push(m.text), onEnd: resolve }); });
      out.push({ id: sn.id, file: sn.file, got: lines.join('\n').trim(), ok: end.ok, err: end.error?.message });
    }
    return out;
  }, snippets);
  for (const r of ran) {
    const want = snippets.find((s) => s.id === r.id && s.file === r.file).expect.trim();
    check(`${r.id}/${r.file}`, r.ok && r.got === want, `want ${JSON.stringify(want)}\n      got  ${JSON.stringify(r.got)} ${r.err || ''}`);
  }

  // ------------------------------------------------------------------ editing + errors
  section('Editable code: edit, run, errors');
  await go('/read/c02-t11/3');
  await page.click('.btn-run');
  await page.waitForFunction(() => document.querySelector('.cw-out .out-lines')?.textContent.includes('listeners: 2'), { timeout: 8000 }).catch(() => {});
  check('Run prints the output', (await text('.cw-out .out-lines'))?.includes('kitchen: cook 1'));
  await page.$eval('.ed-ta', (e) => { e.focus(); e.select(); });
  await page.keyboard.type('console.log(6 * 7);');
  await page.keyboard.down('Meta'); await page.keyboard.press('Enter'); await page.keyboard.up('Meta');
  await page.waitForFunction(() => document.querySelector('.cw-out .out-lines')?.textContent.trim() === '42', { timeout: 8000 }).catch(() => {});
  check('Edited code runs (⌘↵)', (await text('.cw-out .out-lines')) === '42', await text('.cw-out .out-lines'));
  await page.$eval('.ed-ta', (e) => { e.focus(); e.select(); });
  await page.keyboard.type('while (true) {}');
  await page.keyboard.down('Meta'); await page.keyboard.press('Enter'); await page.keyboard.up('Meta');
  await page.waitForFunction(() => /Stopped after/.test(document.querySelector('.cw-out .out-lines')?.textContent || ''), { timeout: 9000 }).catch(() => {});
  check('Infinite loop is stopped by the watchdog', /Stopped after/.test((await text('.cw-out .out-lines')) || ''));
  await page.$eval('.ed-ta', (e) => { e.focus(); e.select(); });
  await page.keyboard.type('const x = ;');
  await page.keyboard.down('Meta'); await page.keyboard.press('Enter'); await page.keyboard.up('Meta');
  await page.waitForSelector('.oline.lv-fail', { timeout: 8000 }).catch(() => {});
  check('Syntax error shown with an "Ask about this error" button', !!(await page.$('.oline.lv-fail .btn')));

  // ------------------------------------------------------------------ keyboard navigation
  section('Keyboard navigation');
  await go('/read/c02-t09');
  check('Starts on the core idea', (await text('.sh-frame')) === 'Core idea');
  await press('ArrowRight');
  check('→ moves to the next frame', (await text('.sh-frame')) === 'How it works');
  await press('ArrowRight', 3);
  check('→ steps the animation first (step 4 / 10)', (await text('.fig-step')) === '4 / 10', await text('.fig-step'));
  await press('ArrowLeft');
  check('← steps back (3 / 10)', (await text('.fig-step')) === '3 / 10', await text('.fig-step'));
  await press('ArrowRight', 8);
  check('after the last step, → moves to In code', (await text('.sh-frame')) === 'In code', await text('.sh-frame'));
  await press('PageDown');
  check('PageDown jumps a frame', (await text('.sh-frame')) === 'Watch out · Check');
  await press('1');
  check('Number key answers the quiz', !!(await page.$('.q-opt.is-bad, .q-opt.is-ok')));
  await press('ArrowRight');
  check('Last frame opens an end card (no silent jump)', (await text('.frame-end .end-title')) === 'The event loop');
  check('URL reflects the frame', new URL(page.url()).pathname === '/read/c02-t09/5', page.url());
  await press(']');
  await page.waitForFunction(() => location.pathname.startsWith('/read/c02-t10'), { timeout: 4000 }).catch(() => {});
  check('] goes to the next page', page.url().includes('/read/c02-t10'), page.url());
  await page.waitForSelector('.frame-idea, .frame-soon', { timeout: 4000 }).catch(() => {});
  // every page is written now; the "soon" frame remains only as a safety net for a page that is missing
  check('The next page renders its first frame (not the "soon" fallback)', !!(await page.$('.frame-idea')) && !(await page.$('.frame-soon')));

  // ------------------------------------------------------------------ palette, notes, progress
  section('Palette, notes, progress');
  await go('/');
  await page.keyboard.down('Meta'); await page.keyboard.press('k'); await page.keyboard.up('Meta');
  await page.waitForSelector('dialog.palette[open]');
  await page.keyboard.type('middleware');
  await sleep(300);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.pathname.startsWith('/read/c04-t08'), { timeout: 4000 }).catch(() => {});
  check('⌘K finds a page and opens it', page.url().includes('/read/c04-t08'), page.url());

  await go('/read/c00-t01');
  await page.keyboard.press('n');
  await sleep(300);
  await page.type('.notes-ta', 'Remember: backend = kitchen.');
  await sleep(1400);
  await go('/read/c00-t01');
  await page.keyboard.press('n');
  await sleep(500);
  check('Notes are saved and come back after a reload', (await page.$eval('.notes-ta', (e) => e.value)).includes('backend = kitchen'));

  await go('/read/c00-t01/4');
  await sleep(1500);
  const prog = await (await fetch(`${BASE}/api/progress`)).json();
  check('Reaching the end card marks the page done', !!prog.topics['c00-t01']?.done);
  await go('/');
  check('Home counts the finished pages', Number(await text('.stat b')) >= 2, await text('.stat b'));

  // ------------------------------------------------------------------ the tutor
  if (skipChat) { section('Tutor (skipped: --no-chat)'); } else {
    section('Tutor: a real streamed answer, saved and restored');
    await go('/read/c02-t09');
    await page.click('.composer-ta');
    await page.keyboard.type('In one short sentence, what is libuv?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.msg-ai .msg-md')?.textContent.trim().length > 20 && !document.querySelector('.send.is-stop'), { timeout: 60000 }).catch(() => {});
    const answer = await text('.msg-ai .msg-md');
    check('An answer streams in', !!answer && answer.length > 20, String(answer));
    check('The answer is about libuv (page context reached the model)', /libuv|event loop|thread|async/i.test(answer || ''), String(answer));
    await sleep(600);
    check('The chat is saved on disk', existsSync(join(DATA, 'chats', 'c02-t09.json')));
    await go('/read/c02-t09');
    await sleep(800);
    check('The chat is still there after a reload', (await page.$$('.msg-user')).length === 1 && (await page.$$('.msg-ai')).length === 1);
    await page.screenshot({ path: join(root, 'qa', 'shots', 'e2e-chat.png') });
    await go('/chats', '.history');
    await sleep(600);
    check('Saved-chats page lists it', !!(await text('.hist-item .hist-title')));

    section('Tutor: Stop keeps the partial answer');
    await go('/read/c02-t11');
    await page.click('.composer-ta');
    await page.keyboard.type('Explain in detail, in at least 300 words, how EventEmitter works internally.');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (document.querySelector('.msg-ai .msg-md')?.textContent.trim().length || 0) > 15, { timeout: 30000 }).catch(() => {});
    check('Send turns into a Stop button while streaming', !!(await page.$('.send.is-stop')));
    await page.click('.send.is-stop');
    await page.waitForFunction(() => !document.querySelector('.send.is-stop'), { timeout: 10000 }).catch(() => {});
    await sleep(800);
    check('The partial answer stays and is marked stopped', /Stopped/.test((await text('.msg-note')) || ''), String(await text('.msg-note')));
    const partial = (await text('.msg-ai .msg-md')) || '';
    await go('/read/c02-t11');
    await sleep(900);
    const again = (await text('.msg-ai .msg-md')) || '';
    check('The stopped answer is still there after a reload', again.length > 10 && again.slice(0, 20) === partial.slice(0, 20), `${partial.length} vs ${again.length} chars`);

    section('Role-play: scripted opening, in-character reply, debrief');
    await go('/read/c04-t07');
    await sleep(800);
    check('Scripted opening is already in the chat', !!(await page.$('.msg-ai.is-scripted')));
    await page.click('.composer-ta');
    await page.keyboard.type('Why did you set cors origin to *?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.msg-ai').length >= 2 && !document.querySelector('.send.is-stop'), { timeout: 60000 }).catch(() => {});
    const reply = await page.$$eval('.msg-ai .msg-md', (els) => els.at(-1).textContent.trim());
    check('Priya answers in character', reply.length > 10 && !/SCORE:/.test(reply), reply);
    await page.click('.debrief-btn');
    await page.waitForFunction(() => /SCORE:/.test(document.querySelector('.msgs')?.textContent || '') && !document.querySelector('.send.is-stop'), { timeout: 90000 }).catch(() => {});
    const msgs = await text('.msgs');
    check('Debrief ends with a SCORE line', /SCORE:\s*\d+\s*\/\s*\d+/.test(msgs || ''), (msgs || '').slice(-200));
    await page.screenshot({ path: join(root, 'qa', 'shots', 'e2e-roleplay.png') });
  }

  section('Phone layout (390×844)');
  const phone = await browser.newPage();
  await phone.setViewport({ width: 390, height: 844 });
  await phone.goto(`${BASE}/read/c02-t09`, { waitUntil: 'networkidle0' });
  await phone.waitForSelector('.stage-body .frame');
  const vis = (sel) => phone.$eval(sel, (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.left >= -1 && r.right <= innerWidth + 1; }).catch(() => false);
  check('No horizontal scroll', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check('Top-bar actions are on screen', await vis('.tb-dock'));
  await phone.click('.tb-menu');
  await sleep(400);
  check('Menu opens the contents sheet', await vis('.toc-full'));
  await phone.click('#scrim');
  await sleep(300);
  check('Tapping outside closes it', (await phone.$eval('#app', (e) => e.dataset.toc)) === 'closed');
  await phone.click('.tb-dock');
  await sleep(500);
  check('The tutor opens as a sheet inside the screen', await vis('.dock'));
  await phone.keyboard.press('Escape');
  await sleep(400);
  check('Escape closes the tutor', (await phone.$eval('#app', (e) => e.dataset.dock)) === 'closed');
  await phone.close();

  section('Console');
  check('No page errors', pageErrors.length === 0, pageErrors.join(' | '));
} finally {
  await browser.close();
  server.kill('SIGTERM');
  await sleep(400);
  rmSync(DATA, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fails.length} failed${fails.length ? `: ${fails.join('; ')}` : ''}`);
if (fails.length && serverLog.trim()) console.log(`\nserver output:\n${serverLog.trim().slice(-800)}`);
process.exit(fails.length ? 1 : 0);
