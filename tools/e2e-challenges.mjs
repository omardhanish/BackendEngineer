import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

// Browser test of the challenge widget (content/c01/c01-t07.json) on its own throwaway server, so your saved data is untouched.
//   npm run e2e:challenges
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
rmSync(join(root, '.tmp', 'chal-data'), { recursive: true, force: true });
mkdirSync(join(root, 'qa'), { recursive: true });
const PORT = 4011; const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(PORT), DATA_DIR: '.tmp/chal-data', LOG: 'silent' }, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(250); }
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars'] });
const checks = []; const ok = (name, cond, extra = '') => { checks.push(cond); console.log(`${cond ? '✔' : '✖'} ${name}${cond ? '' : ' ' + extra}`); };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/read/c01-t07/4`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.frame-challenges .ch-tab');
  ok('5 challenge tabs', (await page.$$('.ch-tab')).length === 5);
  ok('counter starts at 0 of 5', (await page.$eval('.ch-count', (e) => e.textContent)) === '0 of 5 solved');
  // run the starter: tests must fail
  await page.click('.btn-run'); await page.waitForSelector('.ch-sum', { timeout: 8000 });
  const sum1 = await page.$eval('.ch-sum', (e) => e.textContent);
  ok('starter fails its tests', /0 of 4 tests pass/.test(sum1), sum1);
  await page.screenshot({ path: join(root, 'qa', 'chal-1-fail.png') });
  // hint ladder
  await page.click('.ch-actions .btn-quiet:nth-child(2)'); await page.click('.ch-actions .btn-quiet:nth-child(2)');
  ok('two hints shown', (await page.$$('.ch-hints li')).length === 2);
  // type the solution and run
  const solution = "function parity(n) {\n  if (n % 2 === 0) return 'even';\n  return 'odd';\n}\n";
  await page.$eval('.ed-ta', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, solution);
  await page.click('.btn-run'); await page.waitForFunction(() => document.querySelector('.ch-sum')?.classList.contains('is-ok'), { timeout: 8000 });
  ok('solution passes', true);
  ok('tab 1 marked solved', await page.$eval('.ch-tab', (e) => e.classList.contains('is-solved')));
  ok('counter shows 1 of 5', (await page.$eval('.ch-count', (e) => e.textContent)) === '1 of 5 solved');
  await page.screenshot({ path: join(root, 'qa', 'chal-2-pass.png') });
  // a syntax error shows an error panel, not a crash
  await page.$eval('.ed-ta', (el) => { el.value = 'function parity(n) { return ;; ]'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.btn-run'); await page.waitForSelector('.ch-err', { timeout: 8000 });
  ok('syntax error is reported', /SyntaxError/.test(await page.$eval('.ch-err', (e) => e.textContent)), await page.$eval('.ch-err', (e) => e.textContent));
  // infinite loop is stopped by the runner timeout
  await page.$eval('.ed-ta', (el) => { el.value = 'function parity(n) { while (true) {} }'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.btn-run'); await page.waitForFunction(() => /Timeout|took too long|Stopped/.test(document.querySelector('.ch-results')?.textContent || ''), { timeout: 12000 });
  ok('infinite loop is stopped', true);
  // solution reveal is two-click
  await page.click('.ch-actions .btn-quiet:nth-child(3)');
  ok('first click only arms the reveal', await page.$eval('.ch-solution', (e) => e.hidden));
  await page.click('.ch-actions .btn-quiet:nth-child(3)');
  ok('second click shows the solution', !(await page.$eval('.ch-solution', (e) => e.hidden)));
  // progress was saved on the server
  const prog = await (await fetch(`${BASE}/api/progress`)).json();
  ok('solved is saved server-side', !!prog.topics['c01-t07']?.solved?.parity, JSON.stringify(prog.topics['c01-t07']));
  // reload: solved state and draft survive
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForSelector('.ch-tab');
  ok('solved survives a reload', await page.$eval('.ch-tab', (e) => e.classList.contains('is-solved')));
  // next challenge, phone width
  await page.setViewport({ width: 390, height: 844 }); await page.reload({ waitUntil: 'networkidle0' }); await page.waitForSelector('.ch-tab');
  await page.click('.ch-tab:nth-child(2)');
  ok('tab 2 opens', (await page.$eval('.ch-title', (e) => e.textContent)) === 'Letter grade');
  ok('no horizontal overflow on a phone', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  await page.screenshot({ path: join(root, 'qa', 'chal-3-phone.png') });
  // regression: an editor built while its frame is still detached (a page transition can attach it frames later)
  // used to measure itself at zero width and stay 84px tall, hiding most of its code with no way to scroll
  await page.setViewport({ width: 1400, height: 900 });
  const ed = await page.evaluate(async () => {
    const { createEditor } = await import('/js/editor.js');
    const long = Array.from({ length: 60 }, (_, i) => `console.log('line ${i + 1}');`).join('\n');
    const made = createEditor({ value: long, lang: 'js' });
    await new Promise((r) => setTimeout(r, 300));
    const holder = document.createElement('div');
    holder.className = 'cw-body is-editable'; holder.style.cssText = 'position:fixed;left:20px;top:20px;width:800px';
    holder.append(made.el); document.body.append(holder);
    await new Promise((r) => setTimeout(r, 400));
    const ta = made.el.querySelector('.ed-ta');
    const out = { full: ta.clientHeight >= ta.scrollHeight - 2, windowH: holder.clientHeight, contentH: holder.scrollHeight };
    holder.scrollTop = 99999; out.scrolled = holder.scrollTop > 0;
    holder.remove(); return out;
  });
  ok('an editor attached late still shows all its code', ed.full, JSON.stringify(ed));
  ok('a long program scrolls inside its window', ed.contentH > ed.windowH && ed.scrolled, JSON.stringify(ed));
  ok('no console errors', errors.length === 0, errors.join(' | '));
} finally { await browser.close(); server.kill(); }
console.log(checks.every(Boolean) ? '\nALL CHALLENGE UI CHECKS PASSED' : '\nSOME CHECKS FAILED'); process.exit(checks.every(Boolean) ? 0 : 1);
