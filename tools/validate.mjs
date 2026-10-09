// Content validator. Fails the build on: schema errors, "not short and crisp" word caps, broken cross-references
// (animation ids, code files, walk lines), code that does not parse, APIs a book bans, secrets, stale captures,
// and a malformed book.json / syllabus.json. It works on every book in content/books/ (or the ones named with --book).
//   npm run validate                              every written page of every book + coverage report
//   npm run validate -- --book backend-engineer   one book
//   npm run validate -- c02-t09 c04-t08           only these pages (add --book when several books share the id)
//   npm run validate -- --strict                  also fail if any page of a book is still unwritten
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import Ajv from 'ajv';
import { checkScrubber, checkTopology } from './lib/hero-checks.mjs';
import { checkChallenges } from './lib/challenges.mjs';
import { CONTENT, PAGE_ID_RE, ROOT, parseArgs, pickBooks, writtenPages } from './lib/books.mjs';
import { runnableExts, runnerFor } from './lib/runners.mjs';
import { LANGUAGES, LANGUAGE_ID } from '../public/js/languages.js';

const args = parseArgs(process.argv.slice(2));
const strict = args.rest.includes('--strict');
const only = args.ids;

const ajv = new Ajv({ allErrors: true, strict: false });
const validateShape = ajv.compile(JSON.parse(readFileSync(join(CONTENT, '_schema/topic.schema.json'), 'utf8')));

const words = (s) => String(s ?? '').replace(/`/g, '').trim().split(/\s+/).filter(Boolean).length;
const SECRETS = [/sk-[A-Za-z0-9_-]{16,}/, /gh[pousr]_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bannedRegex = (list) => (list.length ? new RegExp(`\\b(${list.map(escapeRe).join('|')})\\b`) : null);
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

function validateTopic(book, id, file, t) {
  const errs = [];
  const warns = [];
  const m = book.topics.get(id);
  const banned = bannedRegex(book.meta.runtime.bannedApis);
  const profile = book.meta.profile;
  const rel = (p) => relative(ROOT, p);
  if (!validateShape(t)) for (const e of validateShape.errors) errs.push(`schema: ${e.instancePath || '/'} ${e.message}`);
  capWords(id, 'title', t.title, 6, errs);

  const isRole = m.kind === 'roleplay';
  if (!isRole) {
    for (const k of ['idea', 'points', 'takeaway']) if (!t[k]) errs.push(`missing "${k}"`);
    if (t.points && (t.points.length < 3 || t.points.length > 4)) errs.push(`points: 3 or 4 required, found ${t.points.length}`);
    if (!t.hero && !t.code?.length && !t.challenges?.items?.length) errs.push('needs a hero visual, a code example or challenges');
    if (m.kind === 'challenge' && !t.challenges?.items?.length) errs.push('a challenge page needs a "challenges" set');
    if (t.challenges?.items?.length && !['js', 'mixed'].includes(profile)) errs.push(`challenges run JavaScript in the browser; a ${profile} book cannot have them (use a normal page whose quiz asks the learner to predict or fix code)`);
    if (m.depth >= 2 && !t.quiz) errs.push('depth 2+ pages need a quiz');
    if (m.depth >= 2 && !(t.pitfalls?.length >= 2)) errs.push('depth 2+ pages need 2 to 3 pitfalls');
    if (m.depth === 3 && !t.analogy) warns.push('depth 3 pages should have an analogy');
  } else {
    if (!t.scenario) errs.push('role-play needs a "scenario"');
    if (!existsSync(join(book.dir, 'roleplay', `${id}.key.json`))) errs.push(`missing ${rel(join(book.dir, 'roleplay', `${id}.key.json`))}`);
    else {
      const key = JSON.parse(readFileSync(join(book.dir, 'roleplay', `${id}.key.json`), 'utf8'));
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
  const dir = join(book.dir, 'code', id);
  if (t.challenges && !['js', 'mixed'].includes(profile)) errs.push('challenges run in the browser, so they are JavaScript-only (use a "js" or "mixed" book)');
  for (const sn of t.code || []) {
    const path = join(dir, sn.file);
    if (!existsSync(path)) { errs.push(`code file missing: ${rel(path)}`); continue; }
    const langId = LANGUAGE_ID(sn.lang);
    if (!langId) errs.push(`${sn.file}: unknown lang "${sn.lang}" (known: ${Object.keys(LANGUAGES).join(', ')})`);
    const src = readFileSync(path, 'utf8');
    const lines = src.replace(/\n$/, '').split('\n');
    const cap = LANGUAGES[langId]?.long ? 18 : 14;
    if (lines.length > cap && !sn.walk && !(isRole && sn.run === 'static')) errs.push(`${sn.file}: ${lines.length} lines (max ${cap} without a walkthrough)`);
    if (lines.some((l) => l.length > 80)) errs.push(`${sn.file}: a line is longer than 80 columns`);
    const isShell = /\.sh$/.test(sn.file);
    const runner = runnerFor(sn.file);
    const okExts = runnableExts(profile);
    if (sn.run !== 'static' && !isShell && banned && banned.test(src)) errs.push(`${sn.file}: uses an API this book bans (${banned.exec(src)[1]}${book.meta.runtime.banHint ? `: ${book.meta.runtime.banHint}` : ''})`);
    if (sn.run !== 'static' && !(isShell && sn.run === 'captured') && !okExts.includes(extname(sn.file))) errs.push(`${sn.file}: a runnable file in a "${profile}" book must end in ${okExts.join(' or ') || '(nothing: use static snippets)'} (a shell transcript .sh must be run: "captured")`);
    if (sn.run === 'browser' && !/\.(mjs|cjs)$/.test(sn.file)) errs.push(`${sn.file}: only JavaScript can run in the browser; use run: "captured"`);
    if (runner && sn.run !== 'static' && !runner.needs().ok) errs.push(`${sn.file}: ${runner.label} is not installed on this machine, so this snippet cannot be run here; use run: "static" with illustrative: true`);
    if (isShell && sn.run === 'captured') {
      const r = spawnSync('bash', ['-n', path], { encoding: 'utf8' });
      if (r.status !== 0) errs.push(`${sn.file}: shell syntax error: ${r.stderr.split('\n')[0]}`);
      if (/&&\s*cd\s|;\s*cd\s/.test(src)) errs.push(`${sn.file}: put \`cd\` on its own line (a transcript only carries a standalone cd to the next line)`);
    }
    if (sn.needs && (sn.run !== 'captured' || !Array.isArray(sn.needs) || sn.needs.some((n) => !['postgres', 'mongo'].includes(n)))) errs.push(`${sn.file}: needs must be a list of "postgres" and/or "mongo", and the snippet must be run: "captured"`);
    if (/\.js$/.test(sn.file)) {
      const r = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      if (r.status !== 0) errs.push(`${sn.file}: does not parse: ${r.stderr.split('\n').find((l) => /Error/.test(l)) || r.stderr.slice(0, 120)}`);
    } else if (runner && runner.needs().ok) {
      const r = runner.check(path);
      if (r.status !== 0) errs.push(`${sn.file}: does not parse: ${r.stderr.split('\n').find((l) => /rror/.test(l)) || r.stderr.slice(0, 120)}`);
    }
    if (sn.run === 'static' && !sn.illustrative && !isRole && /\.(mjs|cjs)$/.test(sn.file)) warns.push(`${sn.file}: JavaScript marked static; make it "browser" or "captured" so it is verified`);
    if (sn.run === 'browser' || sn.run === 'captured') {
      const out = `${path}.out.json`;
      if (!existsSync(out)) errs.push(`${sn.file}: not captured yet (run: npm run capture -- --book ${book.slug} ${id})`);
      else if (JSON.parse(readFileSync(out, 'utf8')).hash !== createHash('sha256').update(src + (sn.needs?.length ? `\0${JSON.stringify(sn.needs)}` : '')).digest('hex').slice(0, 16)) errs.push(`${sn.file}: capture is stale (run: npm run capture -- --book ${book.slug} ${id})`);
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

// ------------------------------------------------------------------ the book itself: syllabus.json shape
function checkSyllabus(book) {
  const errs = [];
  const { chapters, topics } = book.syllabus;
  if (!Array.isArray(chapters) || !chapters.length) errs.push('syllabus.json has no chapters');
  if (!Array.isArray(topics) || !topics.length) errs.push('syllabus.json has no topics');
  const chIds = new Set();
  for (const c of chapters || []) {
    if (!/^c\d\d$/.test(c.id || '')) errs.push(`chapter id "${c.id}" must look like c01`);
    if (chIds.has(c.id)) errs.push(`chapter id "${c.id}" is repeated`);
    chIds.add(c.id);
    if (typeof c.title !== 'string' || !c.title.trim()) errs.push(`chapter ${c.id} needs a title`);
    if (c.hue !== undefined && !(Number.isInteger(c.hue) && c.hue >= 0 && c.hue < 360)) errs.push(`chapter ${c.id}: hue must be an integer 0-359`);
  }
  const seen = new Set();
  const listed = new Set();
  for (const c of chapters || []) for (const id of c.topics || []) { if (listed.has(id)) errs.push(`topic ${id} is listed in two chapters`); listed.add(id); }
  for (const t of topics || []) {
    if (!PAGE_ID_RE.test(t.id || '') || !String(t.id).startsWith(`${t.chapter}-`)) errs.push(`topic id "${t.id}" must look like c01-t01 and start with its chapter id`);
    if (seen.has(t.id)) errs.push(`topic id "${t.id}" is repeated`);
    seen.add(t.id);
    if (!chIds.has(t.chapter)) errs.push(`topic ${t.id} points at unknown chapter "${t.chapter}"`);
    if (!['lecture', 'challenge', 'roleplay', 'bonus'].includes(t.kind)) errs.push(`topic ${t.id}: kind must be lecture, challenge, roleplay or bonus`);
    if (t.kind === 'challenge' && !['js', 'mixed'].includes(book.meta.profile)) errs.push(`topic ${t.id}: challenge pages run JavaScript in the browser, so a ${book.meta.profile} book cannot have them (make it a lecture)`);
    if (![1, 2, 3].includes(t.depth)) errs.push(`topic ${t.id}: depth must be 1, 2 or 3`);
    if (typeof t.source !== 'string' || !t.source.trim()) errs.push(`topic ${t.id} needs a source title`);
    if (!listed.has(t.id)) errs.push(`topic ${t.id} is not listed in its chapter's topics`);
  }
  for (const id of listed) if (!seen.has(id)) errs.push(`chapter lists "${id}" but there is no such topic`);
  return errs;
}

// ------------------------------------------------------------------ run
let books;
try { books = pickBooks(args.books); } catch (e) { console.error(`✖ ${e.message}`); process.exit(1); }
if (!books.length) { console.error('✖ no books found in content/books/'); process.exit(1); }
let ok = 0;
let checked = 0;
for (const book of books) {
  console.log(`\n▸ ${book.meta.title} (${book.slug})`);
  for (const e of checkSyllabus(book)) report(book.slug, 'error', e);
  const written = writtenPages(book);
  const todo = only.length ? only.filter((id) => book.topics.has(id) || written.has(id)) : [...written.keys()].sort();
  if (only.length && !todo.length) { if (books.length === 1) for (const id of only) report(id, 'error', 'no such page'); continue; }
  console.log(`Validating ${only.length ? todo.join(', ') : `${written.size} written page(s)`}…`);
  for (const id of todo) {
    if (!written.has(id)) { report(id, 'error', 'no such page file'); continue; }
    checked++;
    if (!book.topics.has(id)) { report(id, 'error', `not in ${book.slug}/syllabus.json`); continue; }
    let t;
    try { t = JSON.parse(readFileSync(written.get(id), 'utf8')); } catch (e) { report(id, 'error', `invalid JSON: ${e.message}`); continue; }
    if (validateTopic(book, id, written.get(id), t)) ok++;
  }
  if (!only.length) {
    const missing = book.syllabus.topics.filter((t) => !written.has(t.id));
    const orphans = [...written.keys()].filter((id) => !book.topics.has(id));
    console.log(`\nCoverage: ${written.size}/${book.syllabus.topics.length} pages written` + (missing.length ? ` (${missing.length} to go)` : ''));
    if (strict && missing.length) report('coverage', 'error', `${missing.length} pages are not written: ${missing.slice(0, 6).map((t) => t.id).join(', ')}…`);
    for (const id of orphans) report(id, 'error', 'page file has no syllabus entry');
  }
}
if (only.length && !checked && !errors) { console.error(`✖ none of ${only.join(', ')} exists in ${books.map((b) => b.slug).join(', ')}`); process.exit(1); }
console.log(`\n${errors ? '✖' : '✔'} ${ok} page(s) clean · ${errors} error(s) · ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
