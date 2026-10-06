// Run every runnable snippet on REAL tools and record its output beside the source (<file>.out.json).
// Never an LLM: the output a learner sees under "Real output" is exactly what this process printed.
//   npm run capture                          capture changed snippets
//   npm run capture -- --force c02-t09       re-run everything (or just the listed pages)
//
// Snippet kinds:
//   .mjs / .cjs   run with Node, inside content/code/<id>/ (so `import express from 'express'` resolves).
//   .sh           a shell TRANSCRIPT: every line is a command, run in order in a fresh temp folder; the recording
//                 shows "$ command" followed by its real output. Fixed identity, dates and time zone, so git
//                 hashes and timestamps are reproducible. `cd` and `export NAME=value` carry over between lines.
//   needs: ["postgres"] | ["mongo"]   (in the page JSON) a REAL PostgreSQL / MongoDB is started for the snippet and
//                 its fresh database is passed as DATABASE_URL / MONGO_URI.
// Every snippet runs twice; if the two outputs differ the capture fails (random ids, timestamps and ports must
// not reach the page).
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const content = join(root, 'content');
const examples = join(content, 'code');
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => /^c\d\d-/.test(a));
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const FORBIDDEN = /(^|[\s;&|(])(sudo|ssh|scp|sftp|curl|wget|brew|apt|apt-get|yum|dnf|docker|kubectl|aws|shutdown|reboot|killall)(\s|$)|\brm\s+-[a-z]*r[a-z]*f?\s+(\/|~|\$HOME)(\s|$)|\bnpm\s+(i|install|add)\s+(-g|--global)|:\(\)\s*\{/;

mkdirSync(join(root, '.tmp'), { recursive: true });
const sandbox = mkdtempSync(join(root, '.tmp', 'capture-'));
const home = join(sandbox, 'home');
mkdirSync(home);

const results = [];
let failures = 0;
const fail = (msg) => { console.error(`✖ ${msg}`); failures++; };

const normalise = (s, extra = []) => {
  let out = String(s);
  for (const [from, to] of extra) if (from) out = out.split(from).join(to);
  return out
    .replaceAll(root, '/app')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/(localhost|127\.0\.0\.1|\[::1\]):\d{4,5}/g, '$1:PORT')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n+$/, '');
};

// ------------------------------------------------------------------ real databases, started on demand
const services = new Map();
const SERVICE_SRC = {
  postgres: `
import EmbeddedPostgres from 'embedded-postgres';
import net from 'node:net';
const port = await new Promise((r) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = new EmbeddedPostgres({ databaseDir: process.env.SVC_DIR, user: 'postgres', password: 'postgres', port, persistent: false, onLog: () => {}, onError: () => {} });
await db.initialise();
await db.start();
const send = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
const { default: pg } = await import('pg');
const c = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password: 'postgres', database: 'postgres' });
await c.connect();
const version = (await c.query('show server_version')).rows[0].server_version.split(' ')[0];
await c.end();
send({ ready: true, port, version });
let buf = '';
process.stdin.on('data', async (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    const m = JSON.parse(line);
    try { if (m.cmd === 'createdb') await db.createDatabase(m.name); send({ ok: true, id: m.id }); } catch (e) { send({ ok: false, id: m.id, error: String(e.message || e) }); }
  }
});
process.stdin.on('end', async () => { try { await db.stop(); } catch {} process.exit(0); });
`,
  mongo: `
import { MongoMemoryServer } from 'mongodb-memory-server';
const m = await MongoMemoryServer.create({ binary: { downloadDir: process.env.SVC_BIN } });
const port = new URL(m.getUri()).port;
const { MongoClient } = await import('mongodb');
const client = await MongoClient.connect(m.getUri());
const version = (await client.db('admin').admin().serverInfo()).version;
await client.close();
process.stdout.write(JSON.stringify({ ready: true, port: Number(port), version }) + '\\n');
process.stdin.resume();
process.stdin.on('end', async () => { try { await m.stop(); } catch {} process.exit(0); });
`,
};

async function startService(name) {
  if (services.has(name)) return services.get(name);
  const dir = join(root, '.tmp', 'svc');
  mkdirSync(dir, { recursive: true });
  const child = spawn(process.execPath, ['--input-type=module', '-e', SERVICE_SRC[name]], {
    cwd: examples,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, SVC_DIR: join(dir, `pg-${process.pid}`), SVC_BIN: join(dir, 'mongo-bin'), MONGOMS_DISABLE_POSTINSTALL: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const svc = { child, pending: new Map(), seq: 0, port: 0 };
  let buf = '';
  let errText = '';
  child.stderr.on('data', (d) => { errText += d; });
  const ready = new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error(`${name} did not start in 180 s`)), 180_000);
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.ready) { clearTimeout(timer); svc.port = m.port; svc.version = m.version; res(); } else if (m.id && svc.pending.has(m.id)) { svc.pending.get(m.id)(m); svc.pending.delete(m.id); }
      }
    });
    child.on('exit', (code) => { clearTimeout(timer); rej(new Error(`${name} exited early (${code}): ${errText.slice(0, 400)}`)); });
  });
  svc.call = (msg) => new Promise((res) => { const id = ++svc.seq; svc.pending.set(id, res); child.stdin.write(`${JSON.stringify({ ...msg, id })}\n`); });
  services.set(name, svc);
  await ready;
  return svc;
}

async function stopServices() {
  for (const [, svc] of services) { svc.child.stdin.end(); await new Promise((r) => { svc.child.on('exit', r); setTimeout(r, 8000); }); }
  for (const d of existsSync(join(root, '.tmp', 'svc')) ? readdirSync(join(root, '.tmp', 'svc')) : []) if (d.startsWith('pg-')) rmSync(join(root, '.tmp', 'svc', d), { recursive: true, force: true });
}
process.on('exit', () => { for (const [, svc] of services) svc.child.kill('SIGKILL'); });

let dbCounter = 0;
async function envFor(needs, label) {
  const env = {};
  const names = [];
  for (const n of needs || []) {
    const svc = await startService(n);
    const name = `be_${label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${++dbCounter}`;
    if (n === 'postgres') {
      const r = await svc.call({ cmd: 'createdb', name });
      if (!r.ok) throw new Error(`could not create database: ${r.error}`);
      env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${svc.port}/${name}`;
    } else env.MONGO_URI = `mongodb://127.0.0.1:${svc.port}/${name}`;
    names.push(name);
  }
  return { env, names };
}

// ------------------------------------------------------------------ the two runners
function runNode(file, dir, extraEnv) {
  const r = spawnSync(process.execPath, [file], {
    cwd: dir, encoding: 'utf8', timeout: 30_000, maxBuffer: 1 << 20,
    env: { PATH: process.env.PATH, HOME: home, LANG: 'en_US.UTF-8', NODE_ENV: 'development', NO_COLOR: '1', ...extraEnv },
  });
  return { stdout: r.stdout || '', stderr: r.stderr || '', code: r.status ?? (r.signal ? 1 : 0), error: r.status === 0 ? null : `exited with ${r.status ?? r.signal}` };
}

/** Split a script into commands: one per line; `\` continues a line; a heredoc (<<WORD) runs to its terminator. */
function commandsOf(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const cmds = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    while (/\\$/.test(line) && i + 1 < lines.length) line = `${line.slice(0, -1)}\n${lines[++i]}`;
    const here = /<<-?\s*['"]?(\w+)['"]?/.exec(line);
    if (here) { const term = here[1]; while (i + 1 < lines.length) { line += `\n${lines[++i]}`; if (lines[i].trim() === term) break; } }
    cmds.push(line);
  }
  return cmds;
}

function runShell(file, dir, id) {
  const work = join(sandbox, `home-${++dbCounter}`);
  mkdirSync(work, { recursive: true });
  const rw = realpathSync(work); // the learner's home folder; every transcript starts here
  const rh = rw;
  let cwd = rw;
  const vars = {};
  const lines = [];
  let minute = 0;
  let status = 0;
  const base = {
    PATH: process.env.PATH, HOME: rh, LANG: 'C', LC_ALL: 'C', TZ: 'UTC', NO_COLOR: '1', TERM: 'dumb', GIT_PAGER: 'cat', PAGER: 'cat', GIT_EDITOR: 'true', GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_GLOBAL: join(rh, '.gitconfig'), GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'init.defaultBranch', GIT_CONFIG_VALUE_0: 'main',
    GIT_AUTHOR_NAME: 'Ada Lovelace', GIT_AUTHOR_EMAIL: 'ada@example.com', GIT_COMMITTER_NAME: 'Ada Lovelace', GIT_COMMITTER_EMAIL: 'ada@example.com',
  };
  for (const cmd of commandsOf(readFileSync(file, 'utf8'))) {
    if (FORBIDDEN.test(cmd)) throw new Error(`command is not allowed in a capture: ${cmd.split('\n')[0]}`);
    lines.push(`$ ${cmd}`);
    const cd = /^cd\s+(.+)$/.exec(cmd.trim());
    const exp = /^(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$/.exec(cmd.trim());
    if (cd) { const target = resolve(cwd, cd[1].replace(/^["']|["']$/g, '').replace(/^~/, rh)); if (!existsSync(target)) { lines.push(`bash: cd: ${cd[1]}: No such file or directory`); status = 1; } else cwd = target; continue; }
    if (exp && !/\s/.test(exp[2].trim().replace(/^["'].*["']$/, ''))) { vars[exp[1]] = exp[2].replace(/^["']|["']$/g, ''); continue; }
    const stamp = `2025-03-01T09:${String(minute % 60).padStart(2, '0')}:00+0000`;
    minute++;
    const r = spawnSync('bash', ['-c', `{\n${cmd}\n} 2>&1`], {
      cwd, encoding: 'utf8', timeout: 20_000, maxBuffer: 1 << 20,
      env: { ...base, ...vars, GIT_AUTHOR_DATE: stamp, GIT_COMMITTER_DATE: stamp },
    });
    if (r.error) throw new Error(`${cmd.split('\n')[0]}: ${r.error.message}`);
    status = r.status;
    const out = String(r.stdout || '').replace(/\n+$/, '');
    if (out) lines.push(out);
  }
  const text = lines.join('\n').split(rw).join('/home/ada');
  return { stdout: text, stderr: '', code: 0, error: null, tool: toolsUsed(readFileSync(file, 'utf8')), last: status };
}

function toolsUsed(src) {
  const t = [];
  if (/(^|[\s;|&(])git\s/m.test(src)) { const v = /git version ([\d.]+)/.exec(spawnSync('git', ['--version'], { encoding: 'utf8' }).stdout || ''); t.push(`git ${v ? v[1] : ''}`.trim()); }
  return t.join(' · ') || null;
}

async function dbVersions(needs) {
  const v = [];
  if (needs?.includes('postgres')) v.push(`PostgreSQL ${services.get('postgres')?.version || ''}`.trim());
  if (needs?.includes('mongo')) v.push(`MongoDB ${services.get('mongo')?.version || ''}`.trim());
  return v;
}

// ------------------------------------------------------------------ walk the pages
for (const ch of readdirSync(content).filter((d) => /^c\d\d$/.test(d)).sort()) {
  for (const f of readdirSync(join(content, ch)).filter((n) => n.endsWith('.json')).sort()) {
    const id = f.slice(0, -5);
    if (only.length && !only.includes(id)) continue;
    let topic;
    try { topic = JSON.parse(readFileSync(join(content, ch, f), 'utf8')); } catch (e) { fail(`${id}: invalid JSON (${e.message})`); continue; }
    for (const sn of topic.code || []) {
      if (sn.run !== 'browser' && sn.run !== 'captured') continue;
      const dir = join(content, 'code', id);
      if (!SAFE_FILE.test(String(sn.file)) || !resolve(dir, sn.file).startsWith(resolve(dir) + sep)) { fail(`${id}: unsafe code file name ${JSON.stringify(sn.file)}`); continue; }
      const file = join(dir, sn.file);
      if (!existsSync(file)) { fail(`${id}/${sn.file}: file is missing`); continue; }
      const isShell = /\.sh$/.test(sn.file);
      if (isShell && sn.run !== 'captured') { fail(`${id}/${sn.file}: a .sh file can only be run: "captured"`); continue; }
      if (sn.needs && sn.run !== 'captured') { fail(`${id}/${sn.file}: needs a real database, so it must be run: "captured"`); continue; }
      const src = readFileSync(file, 'utf8');
      const hash = createHash('sha256').update(src + (sn.needs?.length ? `\0${JSON.stringify(sn.needs)}` : '')).digest('hex').slice(0, 16);
      const outPath = `${file}.out.json`;
      if (!force && existsSync(outPath) && JSON.parse(readFileSync(outPath, 'utf8')).hash === hash) { results.push([id, sn.file, 'unchanged']); continue; }
      try {
        const attempts = [];
        for (let n = 0; n < 2; n++) {
          const { env, names } = await envFor(sn.needs, `${id}_${sn.file}`);
          const r = isShell ? runShell(file, dir, id) : runNode(file, dir, env);
          const swap = names.map((nm) => [nm, 'app_db']);
          attempts.push({ ...r, text: normalise(r.stdout, swap), err: normalise(r.stderr, swap) });
          if (r.error) break;
        }
        const [a, b] = attempts;
        if (a.error) { fail(`${id}/${sn.file}: ${a.error}\n${a.err.split('\n').slice(0, 6).join('\n')}`); continue; }
        if (a.text !== b.text || a.err !== b.err) {
          const la = a.text.split('\n'); const lb = b.text.split('\n');
          const i = la.findIndex((l, k) => l !== lb[k]);
          fail(`${id}/${sn.file}: output differs between two runs (random ids, timestamps or ordering?)\n    run 1: ${la[i] ?? '(shorter)'}\n    run 2: ${lb[i] ?? '(shorter)'}`);
          continue;
        }
        const tool = [a.tool, ...(await dbVersions(sn.needs))].filter(Boolean).join(' · ') || null;
        writeFileSync(outPath, `${JSON.stringify({ stdout: a.text, stderr: a.err, code: 0, node: process.versions.node, tool, hash, at: new Date().toISOString() }, null, 2)}\n`);
        results.push([id, sn.file, 'captured']);
      } catch (e) { fail(`${id}/${sn.file}: ${e.message}`); }
    }
  }
}
await stopServices();
rmSync(sandbox, { recursive: true, force: true });

for (const [id, file, state] of results) console.log(`${state === 'captured' ? '✔' : '·'} ${id}/${file} ${state}`);
console.log(failures ? `\n${failures} snippet(s) failed.` : `\nOK: ${results.length} snippet(s), Node ${process.versions.node}.`);
process.exit(failures ? 1 : 0);
