// The animation engines are models of real things (git, JWT, Docker's build cache, consistent hashing).
// These tests keep the models honest by comparing them with the real tools wherever one is installed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engines = `file://${join(root, 'public/js/anim/engines')}`;
const { simulate } = await import(`${engines}/scrubber-git.js`);
const { signHS256 } = await import(`${engines}/scrubber-jwt.js`);
const { plan } = await import(`${engines}/scrubber-layers.js`);
const { ringState } = await import(`${engines}/topology.js`);

// ------------------------------------------------------------------ JWT
test('jwt: the in-page HS256 signer produces exactly the bytes jsonwebtoken produces', async (t) => {
  let jsonwebtoken;
  try { jsonwebtoken = createRequire(join(root, 'content/books/package.json'))('jsonwebtoken'); } catch { t.skip('run `npm run examples:install` to compare with jsonwebtoken'); return; }
  for (const [payload, secret] of [
    [{ sub: '42', role: 'user', exp: 1893456000 }, 'demo-secret'],
    [{ sub: 'ünï-çødé ✓', admin: false, n: 1.5 }, 'ключ'],
    [{}, 'x'],
  ]) {
    const expected = jsonwebtoken.sign(payload, secret, { algorithm: 'HS256', noTimestamp: true });
    assert.equal((await signHS256(payload, secret)).token, expected);
  }
});

test('jwt: a tampered payload cannot keep the old signature', async () => {
  const a = await signHS256({ sub: '42', role: 'user' }, 'k');
  const b = await signHS256({ sub: '42', role: 'admin' }, 'k');
  assert.notEqual(a.sig, b.sig);
  assert.equal((await signHS256({ sub: '42', role: 'user' }, 'other')).sig === a.sig, false);
});

// ------------------------------------------------------------------ layers
test('layers: Docker cache rule (a rebuilt layer invalidates everything below it)', () => {
  const L = [
    { cmd: 'FROM node:20' },
    { cmd: 'COPY package*.json ./', watch: ['package.json', 'package-lock.json'] },
    { cmd: 'RUN npm ci' },
    { cmd: 'COPY . .', watch: ['*'] },
    { cmd: 'CMD ["node","a.js"]' },
  ];
  assert.deepEqual(plan(L, ['*initial*']), [true, true, true, true, true]);
  assert.deepEqual(plan(L, []), [false, false, false, false, false]);
  assert.deepEqual(plan(L, ['src/app.js']), [false, false, false, true, true]);
  assert.deepEqual(plan(L, ['package.json']), [false, true, true, true, true]);
  assert.deepEqual(plan(L, ['line:3']), [false, false, true, true, true]);
  const bad = [{ cmd: 'FROM node:20' }, { cmd: 'COPY . .', watch: ['*'] }, { cmd: 'RUN npm ci' }];
  assert.deepEqual(plan(bad, ['src/app.js']), [false, true, true], 'COPY . . before npm ci reinstalls on every code edit');
});

// ------------------------------------------------------------------ hash ring
test('ring: adding a server only ever moves keys TO the new server', () => {
  let seed = 7;
  const rnd = (n) => { seed = (seed * 48271) % 2147483647; return seed % n; };
  for (let round = 0; round < 40; round++) {
    const servers = { A: { at: rnd(100) }, B: { at: rnd(100) }, C: { at: rnd(100) }, D: { at: rnd(100) } };
    const keys = Array.from({ length: 40 }, (_, i) => ({ id: `k${i}`, at: rnd(100) }));
    const sc = { size: 100, servers, keys };
    const before = ringState(sc, { servers: ['A', 'B', 'C'] }).owners;
    const after = ringState(sc, { servers: ['A', 'B', 'C', 'D'] }).owners;
    for (const k of keys) if (before.get(k.id) !== after.get(k.id)) assert.equal(after.get(k.id), 'D', `key ${k.id} moved between old servers`);
  }
});

test('ring: first server clockwise, wrapping past the end; modulo uses the divisor', () => {
  const sc = { size: 100, servers: { A: { at: 15 }, B: { at: 45 }, C: { at: 80 } }, keys: [{ id: 'x', at: 20 }, { id: 'y', at: 45 }, { id: 'z', at: 99 }, { id: 'w', at: 3 }] };
  const o = ringState(sc, { servers: ['A', 'B', 'C'] }).owners;
  assert.deepEqual([...o], [['x', 'B'], ['y', 'B'], ['z', 'A'], ['w', 'A']]);
  const m = ringState({ ...sc, rule: 'mod' }, { servers: ['A', 'B', 'C'] }).owners;
  assert.deepEqual([...m], [['x', 'C'], ['y', 'A'], ['z', 'A'], ['w', 'A']]); // 20%3=2, 45%3=0, 99%3=0, 3%3=0
  const virtual = { size: 100, servers: { A: { at: [10, 60] }, B: { at: 35 } }, keys: [{ id: 'k', at: 50 }] };
  assert.equal(ringState(virtual, { servers: ['A', 'B'] }).owners.get('k'), 'A', 'virtual node at 60 owns key 50');
});

// ------------------------------------------------------------------ git: the model against the real thing
const hasGit = spawnSync('git', ['--version']).status === 0;

function realGit(ops) {
  const dir = mkdtempSync(join(tmpdir(), 'be-git-'));
  const env = { PATH: process.env.PATH, HOME: dir, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', GIT_EDITOR: 'true' };
  let tick = 1_700_000_000;
  const git = (...a) => {
    const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...env, GIT_AUTHOR_DATE: `${tick} +0000`, GIT_COMMITTER_DATE: `${tick++} +0000` } });
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  git('init', '-q', '-b', 'main');
  for (const op of ops) {
    const [cmd, ...a] = op.split(/\s+/);
    if (cmd === 'commit') { writeFileSync(join(dir, `${a[0]}.txt`), a[0]); git('add', '.'); git('commit', '-q', '-m', a[0]); }
    else if (cmd === 'branch') git('branch', a[0]);
    else if (cmd === 'checkout') git('checkout', '-q', ...a);
    else if (cmd === 'merge') { const noff = a[0] === '--no-ff'; const [n, id] = noff ? a.slice(1) : a; git('merge', ...(noff ? ['--no-ff'] : []), '-m', id || 'M', n); }
    else if (cmd === 'rebase') git('rebase', '-q', a[0]);
    else throw new Error(`test does not support ${cmd}`);
  }
  const canon = (rev) => {
    const [msg, ...parents] = git('log', '-1', '--format=%s %P', rev).split(' ');
    return `${msg}[${parents.filter(Boolean).map((p) => canon(p)).join(',')}]`;
  };
  const branches = git('for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n');
  const out = Object.fromEntries(branches.map((b) => [b, canon(b)]));
  const head = git('rev-parse', '--abbrev-ref', 'HEAD');
  rmSync(dir, { recursive: true, force: true });
  return { out, head };
}

function modelGit(ops) {
  const m = simulate(ops);
  const byId = new Map(m.commits.map((c) => [c.id, c]));
  const canon = (id) => { const c = byId.get(id); return `${c.id.replace(/'+$/, '')}[${c.parents.map(canon).join(',')}]`; };
  const out = {};
  for (const [name, id] of m.refs) if (!name.includes('/') && !name.startsWith('tag:')) out[name] = canon(id);
  return { out, head: m.head.ref };
}

const SCENARIOS = {
  'linear history': ['commit A', 'commit B', 'commit C'],
  'branch and diverge': ['commit A', 'commit B', 'checkout -b feature', 'commit C', 'commit D', 'checkout main', 'commit E'],
  'fast-forward merge': ['commit A', 'checkout -b feature', 'commit B', 'commit C', 'checkout main', 'merge feature'],
  'three-way merge commit': ['commit A', 'commit B', 'checkout -b feature', 'commit C', 'checkout main', 'commit D', 'merge feature M'],
  'no-ff merge keeps a merge commit': ['commit A', 'checkout -b feature', 'commit B', 'checkout main', 'merge --no-ff feature M'],
  'rebase then fast-forward': ['commit A', 'commit B', 'checkout -b feature', 'commit C', 'commit D', 'checkout main', 'commit E', 'checkout feature', 'rebase main', 'checkout main', 'merge feature'],
  'rebase when already up to date': ['commit A', 'checkout -b feature', 'commit B', 'rebase main'],
  'merge when already up to date': ['commit A', 'checkout -b feature', 'commit B', 'checkout main', 'commit C', 'checkout feature', 'merge main M', 'merge main'],
  'two feature branches': ['commit A', 'checkout -b f1', 'commit B', 'checkout main', 'checkout -b f2', 'commit C', 'checkout main', 'merge f1 M1', 'merge f2 M2'],
};
for (const [name, ops] of Object.entries(SCENARIOS)) {
  test(`git model matches real git: ${name}`, (t) => {
    if (!hasGit) { t.skip('git is not installed'); return; }
    const real = realGit(ops);
    const model = modelGit(ops);
    assert.deepEqual(model.out, real.out, `branches differ for ${ops.join(' | ')}`);
    assert.equal(model.head, real.head);
  });
}

test('git model: rebase leaves the old commits orphaned (still in the graph, reachable from no ref)', () => {
  const m = simulate(['commit A', 'checkout -b f', 'commit C', 'checkout main', 'commit E', 'checkout f', 'rebase main']);
  const ids = m.commits.map((c) => c.id);
  assert.deepEqual(ids, ['A', 'C', 'E', "C'"]);
  assert.equal(m.refs.get('f'), "C'");
});

// ------------------------------------------------------------------ the validator accepts the gallery samples and rejects broken ones
const { checkScrubber, checkTopology } = await import(`file://${join(root, 'tools/lib/hero-checks.mjs')}`);
const { SAMPLES } = await import(`file://${join(root, 'public/_dev/samples.js')}`);

test('validator: every gallery sample is structurally valid', () => {
  for (const [name, hero] of Object.entries(SAMPLES)) {
    if (hero.type !== 'anim') continue;
    const errs = [];
    (hero.engine === 'topology' ? checkTopology : checkScrubber)(hero.scenario, errs);
    assert.deepEqual(errs, [], `${name}: ${errs.join('; ')}`);
  }
});

test('validator: catches the mistakes authors will actually make', () => {
  const bad = (fn, sc) => { const e = []; fn(sc, e); return e.join(' | '); };
  const base = SAMPLES['topology-lb'].scenario;
  assert.match(bad(checkTopology, { ...base, links: [['c1', 'nope']] }), /unknown node/);
  assert.match(bad(checkTopology, { ...base, tiers: [['c1'], ['lb']] }), /not placed in any tier/);
  assert.match(bad(checkTopology, { ...base, steps: [{ caption: 'x', state: { s1: 'exploded' } }] }), /unknown state/);
  assert.match(bad(checkTopology, { ...base, steps: [{ caption: 'x', badge: { s1: 'far too long a badge' } }] }), /12 characters/);
  const ring = SAMPLES['topology-ring-ring'].scenario;
  assert.match(bad(checkTopology, { ...ring, servers: { ...ring.servers, Z: { at: 250 } } }), /not an integer in 0…99/);
  assert.match(bad(checkScrubber, { kind: 'git', steps: [{ caption: 'x', do: ['commit A', 'commit A'] }] }), /used twice/);
  assert.match(bad(checkScrubber, { kind: 'git', steps: [{ caption: 'x', do: ['frobnicate'] }] }), /unknown git operation/);
  assert.match(bad(checkScrubber, { kind: 'scan', rows: ['a', 'b'], target: 'z', steps: [] }), /8 to 16 rows/);
  assert.match(bad(checkScrubber, { kind: 'layers', layers: [{ cmd: 'FROM x' }], steps: [{ caption: 'x' }] }), /3 to 10 layers/);
  assert.match(bad(checkScrubber, { kind: 'mystery', steps: [] }), /kind must be/);
});
