// Minimal `process` for the in-browser runner. Differences from real Node (nextTick ordering,
// setImmediate timing) are why such snippets are shown with captured output instead.
import EventEmitter from 'events';

export class ProcessExit extends Error {
  constructor(code) {
    super(`process.exit(${code})`);
    this.name = 'ProcessExit';
    this.code = code;
  }
}

export function makeProcess({ write }) {
  const p = new EventEmitter();
  const t0 = performance.now();
  const mem = () => ({ rss: 52_428_800, heapTotal: 6_291_456, heapUsed: 4_194_304, external: 1_048_576, arrayBuffers: 10_240 });
  Object.assign(p, {
    argv: ['/usr/local/bin/node', '/app/main.js'],
    execArgv: [],
    env: { NODE_ENV: 'development' },
    platform: 'linux',
    arch: 'x64',
    pid: 4242,
    ppid: 1,
    title: 'node',
    version: 'v20.20.2',
    versions: { node: '20.20.2', v8: '11.3.244.8-node.33' },
    exitCode: undefined,
    cwd: () => '/app',
    uptime: () => (performance.now() - t0) / 1000,
    hrtime: Object.assign(
      (prev) => {
        const ms = performance.now();
        const s = Math.floor(ms / 1000);
        const ns = Math.round((ms % 1000) * 1e6);
        if (!prev) return [s, ns];
        let ds = s - prev[0];
        let dn = ns - prev[1];
        if (dn < 0) { ds -= 1; dn += 1e9; }
        return [ds, dn];
      },
      { bigint: () => BigInt(Math.round(performance.now() * 1e6)) },
    ),
    memoryUsage: Object.assign(mem, { rss: () => mem().rss }),
    nextTick: (fn, ...args) => queueMicrotask(() => fn(...args)),
    emitWarning: (w) => write('stderr', `(node:4242) ${typeof w === 'string' ? 'Warning: ' + w : `${w.name}: ${w.message}`}\n`),
    exit(code) {
      p.exitCode = code ?? p.exitCode ?? 0;
      throw new ProcessExit(p.exitCode);
    },
    stdout: { isTTY: false, columns: 80, write: (s) => { write('stdout', String(s)); return true; } },
    stderr: { isTTY: false, columns: 80, write: (s) => { write('stderr', String(s)); return true; } },
    binding: () => { throw new Error('process.binding is not available in the browser runner'); },
  });
  return p;
}
