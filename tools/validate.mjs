// Content validator. Fails the build on: schema errors, "not short and crisp" word caps, broken cross-references
// (animation ids, code files, walk lines), JS that does not parse, APIs missing from Node 20, secrets, stale captures.
//   npm run validate                      every written page + coverage report
//   npm run validate -- c02-t09 c04-t08   only these pages
//   npm run validate -- --strict          also fail if any of the 197 pages is still unwritten
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { checkScrubber, checkTopology } from './lib/hero-checks.mjs';
import { checkChallenges } from './lib/challenges.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const content = join(root, 'content');
const strict = process.argv.includes('--strict');
const only = process.argv.slice(2).filter((a) => /^c\d\d-/.test(a));

const syllabus = JSON.parse(readFileSync(join(content, 'syllabus.json'), 'utf8'));
const meta = new Map(syllabus.topics.map((t) => [t.id, t]));
const ajv = new Ajv({ allErrors: true, strict: false });
const validateShape = ajv.compile(JSON.parse(readFileSync(join(content, '_schema/topic.schema.json'), 'utf8')));

const words = (s) => String(s ?? '').replace(/`/g, '').trim().split(/\s+/).filter(Boolean).length;
const SECRETS = [/sk-[A-Za-z0-9_-]{16,}/, /gh[pousr]_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
const NODE20_MISSING = /\b(Object\.groupBy|Map\.groupBy|Promise\.withResolvers|Array\.fromAsync|fs\.glob|new WebSocket)\b/;
const LONG_LANG = new Set(['yaml', 'yml', 'sql', 'docker', 'dockerfile']);
const ENGINES = new Set(['lanes', 'pipeline', 'memory', 'topology', 'scrubber']);
const BUILT_ENGINES = new Set(['lanes', 'pipeline', 'memory', 'topology', 'scrubber']);

let errors = 0;
let warnings = 0;
const report = (id, level, msg) => {
  if (level === 'error') errors++; else warnings++;
  console.log(`  ${level === 'error' ? '✖' : '!'} ${id}: ${msg}`);
};

function capWords(id, label, text, max, errs) {
  const n = words(text);
  if (n > max) errs.push(`${label} has ${n} words (max ${max}): "${String(text).slice(0, 60)}…"`);
}

function checkHero(h, errs) {
  const tl = (t) => capWords(h, 'hero.title', t, 8, errs);
  if (h.title) tl(h.title);
  const caption = (c, where) => capWords('', `${where} caption`, c, 24, errs);
  switch (h.type) {
    case 'anim': {
      if (!ENGINES.has(h.engine)) { errs.push(`hero.engine "${h.engine}" is not one of ${[...ENGINES].join(', ')}`); break; }
      if (!BUILT_ENGINES.has(h.engine)) errs.push(`hero.engine "${h.engine}" is not built yet`);
      const sc = h.scenario;
      if (!sc || !Array.isArray(sc.steps) || sc.steps.length < 2) { errs.push('anim needs scenario.steps (at least 2)'); break; }
      if (sc.steps.length > 14) errs.push(`anim has ${sc.steps.length} steps (max 14)`);
      sc.steps.forEach((s, i) => { if (!s.caption) errs.push(`anim step ${i + 1} has no caption`); else caption(s.caption, `anim step ${i + 1}`); });
      if (h.engine === 'lanes') {
        const lanes = new Set((sc.lanes || []).map((l) => l.id));
        if (!lanes.size) errs.push('lanes: scenario.lanes is empty');
        if (lanes.size > 4) errs.push('lanes: at most 4 lanes');
        sc.steps.forEach((s, i) => {
          for (const [lane, toks] of Object.entries(s.at || {})) {
            if (!lanes.has(lane)) errs.push(`lanes step ${i + 1}: unknown lane "${lane}"`);
            for (const t of toks) if (!sc.tokens?.[t]) errs.push(`lanes step ${i + 1}: unknown token "${t}"`);
          }
        });
      } else if (h.engine === 'pipeline') {
        const stages = new Set((sc.stages || []).map((s) => s.id));
        if (stages.size < 2 || stages.size > 6) errs.push('pipeline: 2 to 6 stages');
        sc.steps.forEach((s, i) => { if (!stages.has(s.at)) errs.push(`pipeline step ${i + 1}: unknown stage "${s.at}"`); });
      } else if (h.engine === 'memory') {
        if (!Array.isArray(sc.code) || !sc.code.length || sc.code.length > 12) errs.push('memory: scenario.code must be 1 to 12 lines');
        sc.steps.forEach((s, i) => { if (!Array.isArray(s.stack) || !s.stack.length) errs.push(`memory step ${i + 1}: needs a stack`); });
      } else if (h.engine === 'topology') checkTopology(sc, errs);
      else if (h.engine === 'scrubber') checkScrubber(sc, errs);
      break;
    }
    case 'flow': {
      const ids = new Set((h.nodes || []).map((n) => n.id));
      if (ids.size < 2 || ids.size > 8) errs.push('flow: 2 to 8 nodes');
      (h.nodes || []).forEach((n) => capWords('', `flow node "${n.id}" label`, n.label, 5, errs));
      for (const e of h.edges || []) if (!ids.has(e.from) || !ids.has(e.to)) errs.push(`flow: edge ${e.from}→${e.to} references an unknown node`);
      (h.steps || h.edges || []).forEach((s, i) => { if (s.caption) caption(s.caption, `flow step ${i + 1}`); });
      break;
    }
    case 'seq': {
      const ids = new Set((h.actors || []).map((a) => a.id));
      if (ids.size < 2 || ids.size > 5) errs.push('seq: 2 to 5 actors');
      if (!h.messages?.length || h.messages.length > 10) errs.push('seq: 1 to 10 messages');
      for (const m of h.messages || []) if (!ids.has(m.from) || !ids.has(m.to)) errs.push(`seq: message "${m.label}" references an unknown actor`);
      break;
    }
    case 'timeline':
      if (!h.items || h.items.length < 3 || h.items.length > 6) errs.push('timeline: 3 to 6 items');
      (h.items || []).forEach((it) => { capWords('', 'timeline label', it.label, 4, errs); capWords('', 'timeline text', it.text, 14, errs); });
      break;
    case 'compare':
      for (const side of [h.left, h.right]) {
        if (!side?.items || side.items.length < 2 || side.items.length > 5) errs.push('compare: each side needs 2 to 5 items');
        (side?.items || []).forEach((t) => capWords('', 'compare item', t, 12, errs));
      }
      if (h.verdict) capWords('', 'compare verdict', h.verdict, 18, errs);
      break;
    case 'table':
      if (!h.head?.length || !h.rows?.length || h.head.length > 5 || h.rows.length > 6) errs.push('table: head ≤ 5 columns and 1 to 6 rows');
      for (const r of h.rows || []) if (r.length !== h.head.length) errs.push('table: every row must have as many cells as the head');
      break;
    case 'anatomy':
      if (!h.parts || h.parts.length < 3 || h.parts.length > 8) errs.push('anatomy: 3 to 8 parts');
      (h.parts || []).forEach((p) => capWords('', `anatomy part "${p.label}" note`, p.note, 20, errs));
      (h.parts || []).forEach((p) => { if (p.tone && !'abcde'.includes(p.tone)) errs.push(`anatomy part "${p.label}": tone must be a, b, c, d or e (or omitted)`); });
      break;
    default:
      errs.push(`unknown hero type "${h.type}"`);
  }
}

function validateTopic(id, file, t) {
  const errs = [];
  const warns = [];
  const m = meta.get(id);
  if (!validateShape(t)) for (const e of validateShape.errors) errs.push(`schema: ${e.instancePath || '/'} ${e.message}`);
  capWords(id, 'title', t.title, 6, errs);

  const isRole = m.kind === 'roleplay';
  if (!isRole) {
    for (const k of ['idea', 'points', 'takeaway']) if (!t[k]) errs.push(`missing "${k}"`);
    if (t.points && (t.points.length < 3 || t.points.length > 4)) errs.push(`points: 3 or 4 required, found ${t.points.length}`);
    if (!t.hero && !t.code?.length && !t.challenges?.items?.length) errs.push('needs a hero visual, a code example or challenges');
    if (m.kind === 'challenge' && !t.challenges?.items?.length) errs.push('a challenge page needs a "challenges" set');
    if (m.depth >= 2 && !t.quiz) errs.push('depth 2+ pages need a quiz');
    if (m.depth >= 2 && !(t.pitfalls?.length >= 2)) errs.push('depth 2+ pages need 2 to 3 pitfalls');
    if (m.depth === 3 && !t.analogy) warns.push('depth 3 pages should have an analogy');
  } else {
    if (!t.scenario) errs.push('role-play needs a "scenario"');
    if (!existsSync(join(content, 'roleplay', `${id}.key.json`))) errs.push(`missing content/roleplay/${id}.key.json`);
    else {
      const key = JSON.parse(readFileSync(join(content, 'roleplay', `${id}.key.json`), 'utf8'));
      for (const k of ['persona', 'setup', 'opening', 'hidden', 'flaws']) if (!key[k]) errs.push(`role-play key is missing "${k}"`);
    }
    if (!t.code?.length) errs.push('role-play needs an artifact in "code"');
  }

  // brevity caps
  if (t.idea) capWords(id, 'idea', t.idea, 28, errs);
  if (t.analogy) { capWords(id, 'analogy.text', t.analogy.text, 30, errs); if (t.analogy.breaks) capWords(id, 'analogy.breaks', t.analogy.breaks, 14, errs); }
  (t.points || []).forEach((p, i) => capWords(id, `points[${i}]`, p, 14, errs));
  (t.pitfalls || []).forEach((p, i) => capWords(id, `pitfalls[${i}]`, p, 16, errs));
  if (t.takeaway) capWords(id, 'takeaway', t.takeaway, 14, errs);
  const f1 = words(t.idea) + words(t.analogy?.text) + words(t.analogy?.breaks);
  if (f1 > 74) errs.push(`frame 1 (idea + analogy) has ${f1} words (max 74)`);
  const f4 = (t.pitfalls || []).reduce((n, p) => n + words(p), 0) + words(t.takeaway);
  if (f4 > 70) errs.push(`frame 4 (pitfalls + takeaway) has ${f4} words (max 70)`);
  if (t.quiz) {
    capWords(id, 'quiz.q', t.quiz.q, 20, errs);
    t.quiz.options?.forEach((o, i) => capWords(id, `quiz.options[${i}]`, o, 10, errs));
    capWords(id, 'quiz.why', t.quiz.why, 30, errs);
    if (t.quiz.answer >= (t.quiz.options?.length ?? 0)) errs.push('quiz.answer points past the options');
    if (t.quiz.code && t.quiz.code.trim().split('\n').length > 10) errs.push('quiz.code has more than 10 lines');
  }
  if (t.hero) checkHero(t.hero, errs);

  // code
  const dir = join(content, 'code', id);
  for (const sn of t.code || []) {
    const path = join(dir, sn.file);
    if (!existsSync(path)) { errs.push(`code file missing: content/code/${id}/${sn.file}`); continue; }
    const src = readFileSync(path, 'utf8');
    const lines = src.replace(/\n$/, '').split('\n');
    const cap = LONG_LANG.has(sn.lang) ? 18 : 14;
    if (lines.length > cap && !sn.walk && !(isRole && sn.run === 'static')) errs.push(`${sn.file}: ${lines.length} lines (max ${cap} without a walkthrough)`);
    if (lines.some((l) => l.length > 80)) errs.push(`${sn.file}: a line is longer than 80 columns`);
    const isShell = /\.sh$/.test(sn.file);
    if (sn.run !== 'static' && !isShell && NODE20_MISSING.test(src)) errs.push(`${sn.file}: uses an API missing from Node 20 (${NODE20_MISSING.exec(src)[1]})`);
    if (sn.run !== 'static' && !/\.(mjs|cjs)$/.test(sn.file) && !(isShell && sn.run === 'captured')) errs.push(`${sn.file}: runnable files must end in .mjs or .cjs (a shell transcript .sh must be run: "captured")`);
    if (isShell && sn.run === 'captured') {
      const r = spawnSync('bash', ['-n', path], { encoding: 'utf8' });
      if (r.status !== 0) errs.push(`${sn.file}: shell syntax error: ${r.stderr.split('\n')[0]}`);
      if (/&&\s*cd\s|;\s*cd\s/.test(src)) errs.push(`${sn.file}: put \`cd\` on its own line (a transcript only carries a standalone cd to the next line)`);
    }
    if (sn.needs && (sn.run !== 'captured' || !Array.isArray(sn.needs) || sn.needs.some((n) => !['postgres', 'mongo'].includes(n)))) errs.push(`${sn.file}: needs must be a list of "postgres" and/or "mongo", and the snippet must be run: "captured"`);
    if (/\.(mjs|cjs|js)$/.test(sn.file)) {
      const r = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      if (r.status !== 0) errs.push(`${sn.file}: does not parse: ${r.stderr.split('\n').find((l) => /Error/.test(l)) || r.stderr.slice(0, 120)}`);
    }
    if (sn.run === 'static' && !sn.illustrative && !isRole && /\.(mjs|cjs)$/.test(sn.file)) warns.push(`${sn.file}: JavaScript marked static; make it "browser" or "captured" so it is verified`);
    if (sn.run === 'browser' || sn.run === 'captured') {
      const out = `${path}.out.json`;
      if (!existsSync(out)) errs.push(`${sn.file}: not captured yet (run: npm run capture -- ${id})`);
      else if (JSON.parse(readFileSync(out, 'utf8')).hash !== createHash('sha256').update(src + (sn.needs?.length ? `\0${JSON.stringify(sn.needs)}` : '')).digest('hex').slice(0, 16)) errs.push(`${sn.file}: capture is stale (run: npm run capture -- ${id})`);
    }
    for (const w of sn.walk || []) {
      capWords(id, 'walk text', w.text, 18, errs);
      if (w.lines.some((n) => n > lines.length)) errs.push(`${sn.file}: a walk step points past the last line (${lines.length})`);
    }
    if (SECRETS.some((re) => re.test(src))) errs.push(`${sn.file}: looks like it contains a secret`);
  }
  checkChallenges(id, t, dir, errs);
  if (isRole && t.scenario) {
    const art = t.code?.[t.scenario.artifact ?? 0];
    if (!art) errs.push('scenario.artifact does not point at a code entry');
    capWords(id, 'scenario.brief', t.scenario.brief, 40, errs);
  }

  if (SECRETS.some((re) => re.test(JSON.stringify(t)))) errs.push('page text looks like it contains a secret');
  errs.forEach((e) => report(id, 'error', e));
  warns.forEach((w) => report(id, 'warn', w));
  return errs.length === 0;
}

// ------------------------------------------------------------------ run
const written = new Map();
for (const ch of syllabus.chapters) {
  const dir = join(content, ch.id);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) written.set(f.slice(0, -5), join(dir, f));
}

console.log(`Validating ${only.length ? only.join(', ') : `${written.size} written page(s)`}…`);
let ok = 0;
for (const [id, file] of [...written].sort()) {
  if (only.length && !only.includes(id)) continue;
  if (!meta.has(id)) { report(id, 'error', 'not in content/syllabus.json'); continue; }
  let t;
  try { t = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { report(id, 'error', `invalid JSON: ${e.message}`); continue; }
  if (validateTopic(id, file, t)) ok++;
}
for (const id of only) if (!written.has(id)) report(id, 'error', 'no such page file');

if (!only.length) {
  const missing = syllabus.topics.filter((t) => !written.has(t.id));
  const orphans = [...written.keys()].filter((id) => !meta.has(id));
  console.log(`\nCoverage: ${written.size}/${syllabus.topics.length} pages written` + (missing.length ? ` (${missing.length} to go)` : ''));
  if (strict && missing.length) report('coverage', 'error', `${missing.length} pages are not written: ${missing.slice(0, 6).map((t) => t.id).join(', ')}…`);
  for (const id of orphans) report(id, 'error', 'page file has no syllabus entry');
}
console.log(`\n${errors ? '✖' : '✔'} ${ok} page(s) clean · ${errors} error(s) · ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
