// Worker-side runtime for the in-browser code runner (bundled by tools/build-vendor.mjs).
// Installs Node-like globals (require, Buffer, process, timers, console) and reports lifecycle
// events to the sandbox page: {t:'out'|'end', ...}. Nothing here touches the network or the DOM.
import EventEmitter from 'events';
import { Buffer } from 'buffer';
import path from 'path-browserify';
import { inspect, format } from './inspect.mjs';
import { makeFs } from './fs.mjs';
import { makeAssert, deepEqual } from './assert.mjs';
import { makeProcess, ProcessExit } from './process.mjs';

const post = (m) => self.postMessage(m);
const native = {
  setTimeout: self.setTimeout.bind(self),
  clearTimeout: self.clearTimeout.bind(self),
};

// ---------------------------------------------------------------- lifecycle
let finished = false;
let mainSettled = false;
const active = new Set(); // ref'd timers keep the "process" alive, like in Node

function serializeError(e) {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = /blob:[^\s)]*?:(\d+):(\d+)/.exec(String(e.stack || ''));
    return { name: String(e.name || 'Error'), message: String(e.message), line: m ? Number(m[1]) : null, col: m ? Number(m[2]) : null };
  }
  return { name: 'Uncaught', message: `Uncaught ${format('%O', e)}`, line: null, col: null };
}
function finishOk(code = 0) {
  if (finished) return;
  finished = true;
  try { process.emit('exit', code); } catch { /* ignore handler errors */ }
  post({ t: 'end', ok: true, code });
}
function finishErr(e) {
  if (finished) return;
  finished = true;
  post({ t: 'end', ok: false, error: serializeError(e) });
}
function fatal(e) {
  if (e instanceof ProcessExit) finishOk(e.code);
  else finishErr(e);
}
function maybeDone() {
  native.setTimeout(() => {
    if (!finished && mainSettled && active.size === 0) finishOk(process.exitCode ?? 0);
  }, 0);
}

// ---------------------------------------------------------------- timers
let idSeq = 0;
const byId = new Map();
class Timeout {
  constructor(fn, ms, args, repeat, min) {
    if (typeof fn !== 'function') throw new TypeError('The "callback" argument must be of type function.');
    this._fn = fn;
    this._ms = Math.max(min, Math.trunc(Number(ms)) || min);
    this._args = args;
    this._repeat = repeat;
    this._min = min;
    this._ref = true;
    this._dead = false;
    this._schedule();
  }
  _schedule() {
    if (this._ref) active.add(this);
    this._h = native.setTimeout(() => {
      if (this._dead) return;
      if (!this._repeat) { this._dead = true; active.delete(this); }
      try { this._fn(...this._args); } catch (e) { fatal(e); return; }
      if (this._repeat && !this._dead) this._schedule();
      maybeDone();
    }, this._ms);
  }
  ref() { this._ref = true; if (!this._dead) active.add(this); return this; }
  unref() { this._ref = false; active.delete(this); return this; }
  hasRef() { return this._ref; }
  refresh() { if (!this._dead) { native.clearTimeout(this._h); this._schedule(); } return this; }
  close() { clear(this); return this; }
  [Symbol.toPrimitive]() { if (!this._id) { this._id = ++idSeq; byId.set(this._id, this); } return this._id; }
}
function clear(t) {
  if (t instanceof Timeout) { t._dead = true; active.delete(t); native.clearTimeout(t._h); byId.delete(t._id); }
  else if (typeof t === 'number' && byId.has(t)) clear(byId.get(t));
}
const later = (fn) => new Timeout(fn, 0, [], false, 0);

self.setTimeout = (fn, ms, ...args) => new Timeout(fn, ms, args, false, 1);
self.setInterval = (fn, ms, ...args) => new Timeout(fn, ms, args, true, 1);
self.setImmediate = (fn, ...args) => new Timeout(fn, 0, args, false, 0);
self.clearTimeout = clear;
self.clearInterval = clear;
self.clearImmediate = clear;

// ---------------------------------------------------------------- console
let indent = '';
const emit = (level, text) => post({ t: 'out', level, text: indent ? text.split('\n').map((l) => indent + l).join('\n') : text });
const stdoutWrite = (stream, s) => post({ t: 'out', level: stream === 'stderr' ? 'error' : 'log', text: s, raw: true });
const timersMap = new Map();
const counts = new Map();

function renderTable(data, filter) {
  if (data === null || typeof data !== 'object') return format(data);
  const rows = data instanceof Map ? [...data].map(([k, v]) => [inspect(k), v]) : Object.entries(data);
  const cell = (v) => inspect(v, { depth: 0, breakLength: Infinity });
  const keys = [];
  let hasValues = false;
  const body = rows.map(([idx, v]) => {
    const r = { idx: String(idx) };
    if (v !== null && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        if (filter && !filter.includes(k)) continue;
        if (!keys.includes(k)) keys.push(k);
        r[k] = cell(v[k]);
      }
    } else { hasValues = true; r.__v = cell(v); }
    return r;
  });
  const head = ['(index)', ...keys, ...(hasValues ? ['Values'] : [])];
  const matrix = body.map((r) => [r.idx, ...keys.map((k) => r[k] ?? ''), ...(hasValues ? [r.__v ?? ''] : [])]);
  const widths = head.map((h, i) => Math.max(h.length, ...matrix.map((r) => r[i].length)) + 2);
  const center = (s, w) => { const t = w - s.length; const l = Math.floor(t / 2); return ' '.repeat(l) + s + ' '.repeat(t - l); };
  const line = (a, b, c) => a + widths.map((w) => '─'.repeat(w)).join(b) + c;
  const row = (cells) => '│' + cells.map((c, i) => center(c, widths[i])).join('│') + '│';
  return [line('┌', '┬', '┐'), row(head), line('├', '┼', '┤'), ...matrix.map(row), line('└', '┴', '┘')].join('\n');
}

self.console = {
  log: (...a) => emit('log', format(...a)),
  info: (...a) => emit('info', format(...a)),
  debug: (...a) => emit('debug', format(...a)),
  warn: (...a) => emit('warn', format(...a)),
  error: (...a) => emit('error', format(...a)),
  trace: (...a) => emit('error', `Trace: ${format(...a)}\n    at <anonymous>`),
  dir: (o, opts) => emit('log', inspect(o, opts)),
  assert: (c, ...a) => { if (!c) emit('error', 'Assertion failed' + (a.length ? `: ${format(...a)}` : '')); },
  group: (...a) => { if (a.length) emit('log', format(...a)); indent += '  '; },
  groupCollapsed: (...a) => { if (a.length) emit('log', format(...a)); indent += '  '; },
  groupEnd: () => { indent = indent.slice(2); },
  time: (l = 'default') => { timersMap.set(String(l), performance.now()); },
  timeEnd: (l = 'default') => { const t = timersMap.get(String(l)); if (t == null) return; timersMap.delete(String(l)); emit('log', `${l}: ${(performance.now() - t).toFixed(3)}ms`); },
  timeLog: (l = 'default', ...a) => { const t = timersMap.get(String(l)); if (t != null) emit('log', `${l}: ${(performance.now() - t).toFixed(3)}ms${a.length ? ' ' + format(...a) : ''}`); },
  count: (l = 'default') => { const n = (counts.get(String(l)) || 0) + 1; counts.set(String(l), n); emit('log', `${l}: ${n}`); },
  countReset: (l = 'default') => { counts.delete(String(l)); },
  table: (d, cols) => emit('log', renderTable(d, cols)),
};

// ---------------------------------------------------------------- util & friends
function promisify(fn) {
  if (typeof fn !== 'function') throw new TypeError('The "original" argument must be of type function');
  if (fn[promisify.custom]) return fn[promisify.custom];
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, ...values) => (err ? reject(err) : resolve(values[0])));
    });
  };
}
promisify.custom = Symbol.for('nodejs.util.promisify.custom');
self.setTimeout[promisify.custom] = (ms, v) => new Promise((r) => self.setTimeout(r, ms, v));

const util = {
  inspect,
  format,
  formatWithOptions: (_o, ...a) => format(...a),
  promisify,
  callbackify: (fn) => (...args) => { const cb = args.pop(); fn(...args).then((v) => later(() => cb(null, v)), (e) => later(() => cb(e))); },
  inherits: (c, s) => { Object.setPrototypeOf(c.prototype, s.prototype); c.super_ = s; },
  deprecate: (fn) => fn,
  isDeepStrictEqual: (a, b) => deepEqual(a, b, true),
  isArray: Array.isArray,
  TextEncoder,
  TextDecoder,
  types: {
    isPromise: (v) => v instanceof Promise,
    isRegExp: (v) => v instanceof RegExp,
    isDate: (v) => v instanceof Date,
    isMap: (v) => v instanceof Map,
    isSet: (v) => v instanceof Set,
    isTypedArray: (v) => ArrayBuffer.isView(v) && !(v instanceof DataView),
    isAsyncFunction: (f) => f?.constructor?.name === 'AsyncFunction',
    isGeneratorFunction: (f) => /^(Async)?GeneratorFunction$/.test(f?.constructor?.name),
  },
};

const process = makeProcess({ write: stdoutWrite });
const fs = makeFs({ later });
const assert = makeAssert();
const timersPromises = {
  setTimeout: (ms, v) => new Promise((r) => self.setTimeout(r, ms, v)),
  setImmediate: (v) => new Promise((r) => self.setImmediate(r, v)),
  scheduler: { wait: (ms) => new Promise((r) => self.setTimeout(r, ms)) },
};
const os = {
  EOL: '\n', platform: () => 'linux', type: () => 'Linux', arch: () => 'x64', release: () => '6.0.0', hostname: () => 'localhost',
  homedir: () => '/home/learner', tmpdir: () => '/tmp', totalmem: () => 8 * 2 ** 30, freemem: () => 4 * 2 ** 30, uptime: () => 12345,
  cpus: () => Array.from({ length: 4 }, () => ({ model: 'Virtual CPU', speed: 2400 })),
};
const crypto = {
  randomUUID: () => self.crypto.randomUUID(),
  randomBytes: (n) => Buffer.from(self.crypto.getRandomValues(new Uint8Array(n))),
  randomInt: (a, b) => { const [lo, hi] = b === undefined ? [0, a] : [a, b]; return lo + Math.floor(Math.random() * (hi - lo)); },
  getRandomValues: (a) => self.crypto.getRandomValues(a),
  createHash: () => { throw new Error('crypto.createHash is not available in the browser runner. See the captured output for this example.'); },
};

const registry = {
  events: EventEmitter,
  buffer: { Buffer, kMaxLength: 2 ** 32 },
  path,
  util,
  fs,
  'fs/promises': fs.promises,
  assert,
  'assert/strict': assert,
  timers: { setTimeout: self.setTimeout, setInterval: self.setInterval, setImmediate: self.setImmediate, clearTimeout: clear, clearInterval: clear, clearImmediate: clear },
  'timers/promises': timersPromises,
  process,
  os,
  crypto,
  url: { URL, URLSearchParams, fileURLToPath: (u) => new URL(u).pathname, pathToFileURL: (p) => new URL(`file://${p}`) },
};
const supported = Object.keys(registry).join(', ');

function require(name) {
  const key = String(name).replace(/^node:/, '');
  if (Object.prototype.hasOwnProperty.call(registry, key)) return registry[key];
  const err = new Error(`Cannot find module '${name}'. The in-browser runner supports: ${supported}. This example needs real Node, so see its captured output instead.`);
  err.code = 'MODULE_NOT_FOUND';
  throw err;
}
const mod = { exports: {}, id: '.', filename: '/app/main.js' };
require.main = mod;

Object.assign(self, { require, module: mod, exports: mod.exports, __filename: '/app/main.js', __dirname: '/app', Buffer, process, global: self });

self.addEventListener('unhandledrejection', (e) => { e.preventDefault(); fatal(e.reason); });
self.addEventListener('error', (e) => { e.preventDefault(); fatal(e.error ?? new Error(e.message)); });
self.__done = () => { mainSettled = true; maybeDone(); };
self.__fail = (e) => fatal(e);
