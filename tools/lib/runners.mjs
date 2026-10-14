// What a code file's extension means for the tools: how to syntax-check it and how to RUN it for a real, recorded output.
// A runner exists only when its toolchain is installed here; a book that needs one that is missing gets a clear message
// and uses `static` + `illustrative` snippets instead. Adding a language = one entry in RUNNERS.
//   .mjs/.cjs  Node        .py  Python 3        .java  Java (single-file source mode)        .c  C (cc)        .sh  shell transcript
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Java libraries every Java example may use (e.g. the PostgreSQL JDBC driver): content/books/java-lib/*.jar,
// fetched by `npm run examples:install` (tools/fetch-java-libs.mjs). Empty when not installed.
const JAVA_LIB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'books', 'java-lib');
// Book examples target Java 17. Use BOOK_JAVA_HOME if set; on macOS otherwise ask java_home for a JDK 17 (so a
// different JAVA_HOME in the user's shell cannot change recorded output); else whatever `java` is on PATH.
const JAVA_HOME = (() => {
  if (process.env.BOOK_JAVA_HOME) return process.env.BOOK_JAVA_HOME;
  if (process.platform !== 'darwin') return null;
  const arch = process.arch === 'arm64' ? ['-a', 'arm64'] : [];
  const r = spawnSync('/usr/libexec/java_home', ['-v', '17', ...arch], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
})();
const JAVA = JAVA_HOME ? join(JAVA_HOME, 'bin', 'java') : 'java';
const JAVAC = JAVA_HOME ? join(JAVA_HOME, 'bin', 'javac') : 'javac';
const javaCp = () => {
  const jars = existsSync(JAVA_LIB) ? readdirSync(JAVA_LIB).filter((f) => f.endsWith('.jar')).sort().map((f) => join(JAVA_LIB, f)) : [];
  return jars.length ? ['-cp', jars.join(':')] : [];
};

const which = (bin) => spawnSync('which', [bin], { encoding: 'utf8' }).stdout.trim();
const cache = new Map();
/** @returns {{ok: boolean, path?: string, version?: string}} */
export function detect(bin, versionArgs = ['--version']) {
  if (cache.has(bin)) return cache.get(bin);
  const path = bin.startsWith('/') ? (existsSync(bin) ? bin : '') : which(bin);
  let info = { ok: false };
  if (path) {
    const r = spawnSync(path, versionArgs, { encoding: 'utf8' });
    const line = `${r.stdout || ''}${r.stderr || ''}`.split('\n').find((l) => /\d/.test(l)) || '';
    info = { ok: true, path, version: (/(\d+\.\d+(?:\.\d+)?)/.exec(line) || [])[1] || line.trim().slice(0, 30), raw: line.trim() };
  }
  cache.set(bin, info);
  return info;
}

const quiet = (r) => ({ status: r.status, stderr: String(r.stderr || '') });

export const RUNNERS = {
  '.mjs': { id: 'node', label: 'Node', needs: () => ({ ok: true, version: process.versions.node }), check: (f) => quiet(spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' })), command: (f) => `node ${basename(f)}`, spawn: (f, cwd, env) => spawnSync(process.execPath, [f], { cwd, env, encoding: 'utf8', timeout: 30_000, maxBuffer: 1 << 20 }) },
  '.cjs': null, // same as .mjs (filled in below)
  '.py': {
    id: 'python', label: 'Python', needs: () => detect('python3'),
    check: (f) => quiet(spawnSync('python3', ['-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1])', f], { encoding: 'utf8' })),
    command: (f) => `python3 ${basename(f)}`,
    env: { PYTHONDONTWRITEBYTECODE: '1', PYTHONHASHSEED: '0', PYTHONUTF8: '1' }, // hash seed 0: sets of strings print in the same order every run
    spawn: (f, cwd, env) => spawnSync('python3', [f], { cwd, env, encoding: 'utf8', timeout: 30_000, maxBuffer: 1 << 20 }),
  },
  '.java': {
    id: 'java', label: 'Java', needs: () => detect(JAVA, ['-version']),
    check: (f) => { const d = mkdtempSync(join(tmpdir(), 'be-javac-')); const r = quiet(spawnSync(JAVAC, ['-proc:none', ...javaCp(), '-d', d, f], { encoding: 'utf8' })); rmSync(d, { recursive: true, force: true }); return r; },
    command: (f) => `java ${basename(f)}`,
    // `java File.java` compiles and runs one source file (JDK 11+); explicit flags keep output identical on every machine
    spawn: (f, cwd, env) => spawnSync(JAVA, ['-Dfile.encoding=UTF-8', '-Duser.language=en', '-Duser.country=US', ...javaCp(), f], { cwd, env, encoding: 'utf8', timeout: 60_000, maxBuffer: 1 << 20 }),
  },
  '.c': {
    id: 'c', label: 'C', needs: () => detect('cc'),
    check: (f) => quiet(spawnSync('cc', ['-fsyntax-only', f], { encoding: 'utf8' })),
    command: (f) => `cc ${basename(f)} -o demo && ./demo`,
    spawn: (f, cwd, env) => {
      const d = mkdtempSync(join(tmpdir(), 'be-cc-'));
      const bin = join(d, 'demo');
      const c = spawnSync('cc', ['-o', bin, f], { cwd, env, encoding: 'utf8', timeout: 60_000 });
      if (c.status !== 0) { rmSync(d, { recursive: true, force: true }); return c; }
      const r = spawnSync(bin, [], { cwd, env, encoding: 'utf8', timeout: 30_000, maxBuffer: 1 << 20 });
      rmSync(d, { recursive: true, force: true });
      return r;
    },
  },
};
RUNNERS['.cjs'] = RUNNERS['.mjs'];

export const runnerFor = (file) => RUNNERS[extname(file)] ?? null;

/** Extensions a book may RUN, by its profile. (.sh transcripts are handled by the capture tool itself.) */
export function runnableExts(profile) {
  const by = { js: ['.mjs', '.cjs'], python: ['.py'], java: ['.java'], c: ['.c'], none: [], mixed: Object.keys(RUNNERS) };
  return by[profile] ?? by.js;
}

export const hasFile = (p) => existsSync(p);
