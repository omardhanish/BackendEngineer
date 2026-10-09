// Challenge pages: structural checks plus the proof that every challenge is fair.
//   solution + tests  → every test passes
//   starter  + tests  → at least one test fails, and nothing crashes before the tests run
// browser mode runs exactly what the page runs (harness + code + tests, in an async function, sloppy mode).
// local mode (a real server, files on disk) copies the files into a temp folder and runs the tests with Node.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HARNESS = readFileSync(join(root, 'public/sandbox/harness.js'), 'utf8');
const words = (s) => String(s ?? '').replace(/`/g, '').trim().split(/\s+/).filter(Boolean).length;
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const CID = /^[a-z0-9-]{1,30}$/;

function runBrowserStyle(code, tests) {
  const dir = mkdtempSync(join(tmpdir(), 'be-chal-'));
  const file = join(dir, 'run.cjs');
  writeFileSync(file, `(async () => {\n${HARNESS}\n${code}\n${tests}\nawait __finish();\n})().catch((e) => { console.log('@@CRASH ' + String((e && e.stack) || e).split('\\n')[0]); });\n`);
  const r = spawnSync(process.execPath, [file], { cwd: dir, encoding: 'utf8', timeout: 10_000, env: { PATH: process.env.PATH, NO_COLOR: '1' } });
  rmSync(dir, { recursive: true, force: true });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@RESULTS '));
  const crash = (r.stdout || '').split('\n').find((l) => l.startsWith('@@CRASH '));
  if (r.error || r.status === null) return { error: 'timed out (an infinite loop?)' };
  if (crash) return { error: crash.slice(8) };
  if (!line) return { error: `no test results (exit ${r.status}): ${(r.stderr || r.stdout || '').split('\n').find((l) => /Error/.test(l)) || ''}`.trim() };
  return { results: JSON.parse(line.slice(10)) };
}

function runLocalStyle(item, dir, serverSrc) {
  const tmp = mkdtempSync(join(tmpdir(), 'be-chal-'));
  writeFileSync(join(tmp, item.file), serverSrc);
  writeFileSync(join(tmp, item.tests), readFileSync(join(dir, item.tests), 'utf8'));
  writeFileSync(join(tmp, 'package.json'), '{"type":"module"}');
  const r = spawnSync(process.execPath, [item.tests], { cwd: tmp, encoding: 'utf8', timeout: 20_000, env: { PATH: process.env.PATH, NO_COLOR: '1' } });
  rmSync(tmp, { recursive: true, force: true });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

/** Pushes human-readable problems onto errs. `dir` is content/books/<book>/code/<id>. */
export function checkChallenges(id, t, dir, errs) {
  const ch = t.challenges;
  if (!ch) return;
  if (ch.intro && words(ch.intro) > 25) errs.push(`challenges.intro has ${words(ch.intro)} words (max 25)`);
  const items = ch.items || [];
  if (!items.length || items.length > 12) errs.push('challenges: 1 to 12 items');
  const seen = new Set();
  for (const it of items) {
    const at = `challenge "${it.id}"`;
    if (!CID.test(it.id || '')) { errs.push(`${at}: id must be lowercase letters, digits and hyphens`); continue; }
    if (seen.has(it.id)) errs.push(`${at}: duplicate id`);
    seen.add(it.id);
    if (words(it.title) > 6) errs.push(`${at}: title has ${words(it.title)} words (max 6)`);
    if (words(it.prompt) > 35) errs.push(`${at}: prompt has ${words(it.prompt)} words (max 35)`);
    if (!Array.isArray(it.hints) || it.hints.length < 2 || it.hints.length > 3) errs.push(`${at}: 2 or 3 hints (nudge, approach, almost the answer)`);
    for (const h of it.hints || []) if (words(h) > 25) errs.push(`${at}: a hint has ${words(h)} words (max 25)`);
    const local = it.mode === 'local';
    const names = local ? [it.starter, it.tests, it.solution, it.file] : [it.starter, it.tests, it.solution];
    if (names.some((n) => typeof n !== 'string' || !SAFE_FILE.test(n))) { errs.push(`${at}: needs safe file names for ${local ? 'file, ' : ''}starter, tests and solution`); continue; }
    if (names.slice(0, 3).some((n) => !existsSync(join(dir, n)))) { errs.push(`${at}: a starter, tests or solution file is missing in code/${id}/ of the book`); continue; }
    const src = (n) => readFileSync(join(dir, n), 'utf8');
    for (const n of names.slice(0, 3)) if (/\b(import|export)\s/.test(src(n)) && !local) errs.push(`${at}: ${n} must be plain script (no import/export): it runs inside the in-page runner`);
    for (const n of names.slice(0, 3)) if (src(n).split('\n').some((l) => l.length > 80)) errs.push(`${at}: ${n} has a line longer than 80 columns`);
    if (src(it.starter).replace(/\n$/, '').split('\n').length > 18) errs.push(`${at}: starter is longer than 18 lines`);
    if (src(it.solution).replace(/\n$/, '').split('\n').length > 24) errs.push(`${at}: solution is longer than 24 lines`);
    if (local) {
      const good = runLocalStyle(it, dir, src(it.solution));
      if (good.status !== 0) errs.push(`${at}: the solution does not pass its tests: ${good.out.split('\n').slice(-3).join(' | ')}`);
      const bad = runLocalStyle(it, dir, src(it.starter));
      if (bad.status === 0) errs.push(`${at}: the starter already passes the tests, so there is nothing to solve`);
      continue;
    }
    const good = runBrowserStyle(src(it.solution), src(it.tests));
    if (good.error) errs.push(`${at}: solution run failed: ${good.error}`);
    else {
      if (good.results.length < 3 || good.results.length > 10) errs.push(`${at}: ${good.results.length} tests (use 3 to 10)`);
      for (const r of good.results) if (!r.ok) errs.push(`${at}: the SOLUTION fails test "${r.name}": ${r.msg}`);
      for (const r of good.results) if (words(r.name) > 10) errs.push(`${at}: test name "${r.name}" is longer than 10 words`);
    }
    const bad = runBrowserStyle(src(it.starter), src(it.tests));
    if (bad.error) errs.push(`${at}: the starter must run cleanly so the learner sees failing tests, but: ${bad.error}`);
    else if (bad.results.every((r) => r.ok)) errs.push(`${at}: the starter already passes every test, so there is nothing to solve`);
  }
}
