// Screenshots of the dev engine gallery (public/_dev), for checking an engine in isolation.
//   node tools/gallery-shots.mjs --only topology-lb --steps 0,2,4 --themes light,dark --w 860,390
// Output: qa/gallery/<sample>__<theme>__<w>__s<step>.png. Fails on console errors or a sample that did not render.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:4000';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const only = arg('only', '');
const steps = arg('steps', '0').split(',').map(Number);
const themes = arg('themes', 'light').split(',');
const widths = arg('w', '860').split(',').map(Number);
const OUT = join(root, 'qa', 'gallery');
mkdirSync(OUT, { recursive: true });

const { SAMPLES } = await import(`${BASE}/_dev/samples.js`).catch(() => ({ SAMPLES: null }));
let names;
if (SAMPLES) names = Object.keys(SAMPLES);
else { const src = await (await fetch(`${BASE}/_dev/samples.js`)).text(); names = [...src.matchAll(/^\s{2}'([a-z0-9-]+)':/gm)].map((m) => m[1]); }
names = names.filter((n) => !only || n.startsWith(only));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
let failed = 0;
for (const name of names) for (const theme of themes) for (const w of widths) for (const step of steps) {
  const page = await browser.newPage();
  await page.setViewport({ width: Math.max(w + 48, 390), height: 900, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`${BASE}/_dev/gallery.html?only=${name}&theme=${theme}&w=${w}&step=${step}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('body[data-ready]', { timeout: 8000 }).catch(() => problems.push('gallery did not finish'));
  await new Promise((r) => setTimeout(r, 1100)); // let packets finish travelling
  const item = await page.$(`.gal-item[data-name="${name}"]`);
  const failedText = await page.$eval('.gal-item pre', (e) => e.textContent).catch(() => '');
  if (failedText) problems.push(failedText);
  if (item) await item.screenshot({ path: join(OUT, `${name}__${theme}__${w}__s${step}.png`) });
  else problems.push('sample not found');
  if (problems.length) { failed++; console.log(`✖ ${name} ${theme} ${w} s${step}\n    ${problems.join('\n    ')}`); } else console.log(`✔ ${name} ${theme} ${w} s${step}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
