// In-memory `fs` for the in-browser runner. Teaches the API shape and error codes safely;
// nothing touches a real disk. Async variants resolve on a later macrotask, like real I/O.
import path from 'path-browserify';
import { Buffer } from 'buffer';

const CODES = {
  ENOENT: ['no such file or directory', -2],
  EEXIST: ['file already exists', -17],
  EISDIR: ['illegal operation on a directory', -21],
  ENOTDIR: ['not a directory', -20],
  ENOTEMPTY: ['directory not empty', -39],
};

function fsError(code, syscall, p, dest) {
  const [msg, errno] = CODES[code];
  const err = new Error(`${code}: ${msg}, ${syscall} '${p}'${dest ? ` -> '${dest}'` : ''}`);
  Object.assign(err, { errno, code, syscall, path: p });
  if (dest) err.dest = dest;
  return err;
}

export function makeFs({ later }) {
  const cwd = '/app';
  const nodes = new Map();
  const abs = (p) => path.resolve(cwd, String(p));
  nodes.set('/', { type: 'dir', mtime: new Date() });
  nodes.set('/app', { type: 'dir', mtime: new Date() });

  const encOf = (o) => (typeof o === 'string' ? o : o && o.encoding) || null;
  const toBuf = (data, enc) => (typeof data === 'string' ? Buffer.from(data, enc || 'utf8') : Buffer.from(data));
  const childrenOf = (dir) => [...nodes.keys()].filter((k) => k !== dir && path.dirname(k) === dir);

  function stats(node) {
    const size = node.type === 'file' ? node.data.length : 4096;
    return {
      size,
      mtime: node.mtime,
      mtimeMs: node.mtime.getTime(),
      isFile: () => node.type === 'file',
      isDirectory: () => node.type === 'dir',
      isSymbolicLink: () => false,
    };
  }

  const api = {
    existsSync: (p) => nodes.has(abs(p)),
    statSync(p) {
      const n = nodes.get(abs(p));
      if (!n) throw fsError('ENOENT', 'stat', p);
      return stats(n);
    },
    accessSync(p) {
      if (!nodes.has(abs(p))) throw fsError('ENOENT', 'access', p);
    },
    readFileSync(p, opts) {
      const n = nodes.get(abs(p));
      if (!n) throw fsError('ENOENT', 'open', p);
      if (n.type === 'dir') throw fsError('EISDIR', 'read', p);
      const buf = Buffer.from(n.data);
      const enc = encOf(opts);
      return enc ? buf.toString(enc) : buf;
    },
    writeFileSync(p, data, opts) {
      const a = abs(p);
      const parent = nodes.get(path.dirname(a));
      if (!parent) throw fsError('ENOENT', 'open', p);
      if (parent.type !== 'dir') throw fsError('ENOTDIR', 'open', p);
      const existing = nodes.get(a);
      if (existing && existing.type === 'dir') throw fsError('EISDIR', 'open', p);
      const flag = (opts && opts.flag) || 'w';
      let buf = toBuf(data, encOf(opts));
      if (flag.startsWith('a') && existing) buf = Buffer.concat([Buffer.from(existing.data), buf]);
      nodes.set(a, { type: 'file', data: buf, mtime: new Date() });
    },
    appendFileSync(p, data, opts) {
      api.writeFileSync(p, data, { ...(typeof opts === 'string' ? { encoding: opts } : opts), flag: 'a' });
    },
    mkdirSync(p, opts) {
      const a = abs(p);
      const recursive = !!(opts && opts.recursive);
      if (nodes.has(a)) {
        if (recursive && nodes.get(a).type === 'dir') return undefined;
        throw fsError('EEXIST', 'mkdir', p);
      }
      if (!recursive) {
        if (!nodes.has(path.dirname(a))) throw fsError('ENOENT', 'mkdir', p);
        nodes.set(a, { type: 'dir', mtime: new Date() });
        return undefined;
      }
      let first;
      let cur = a;
      const todo = [];
      while (!nodes.has(cur)) { todo.unshift(cur); cur = path.dirname(cur); }
      for (const d of todo) { nodes.set(d, { type: 'dir', mtime: new Date() }); first ??= d; }
      return first;
    },
    readdirSync(p, opts) {
      const a = abs(p);
      const n = nodes.get(a);
      if (!n) throw fsError('ENOENT', 'scandir', p);
      if (n.type !== 'dir') throw fsError('ENOTDIR', 'scandir', p);
      const names = childrenOf(a).map((k) => path.basename(k)).sort();
      if (opts && opts.withFileTypes) {
        return names.map((name) => {
          const node = nodes.get(path.join(a, name));
          return { name, isFile: () => node.type === 'file', isDirectory: () => node.type === 'dir' };
        });
      }
      return names;
    },
    unlinkSync(p) {
      const a = abs(p);
      const n = nodes.get(a);
      if (!n) throw fsError('ENOENT', 'unlink', p);
      if (n.type === 'dir') throw fsError('EISDIR', 'unlink', p);
      nodes.delete(a);
    },
    rmdirSync(p) {
      const a = abs(p);
      const n = nodes.get(a);
      if (!n) throw fsError('ENOENT', 'rmdir', p);
      if (n.type !== 'dir') throw fsError('ENOTDIR', 'rmdir', p);
      if (childrenOf(a).length) throw fsError('ENOTEMPTY', 'rmdir', p);
      nodes.delete(a);
    },
    rmSync(p, opts) {
      const a = abs(p);
      const n = nodes.get(a);
      if (!n) {
        if (opts && opts.force) return;
        throw fsError('ENOENT', 'rm', p);
      }
      if (n.type === 'dir') {
        if (!(opts && opts.recursive)) throw fsError('EISDIR', 'rm', p);
        for (const k of [...nodes.keys()]) if (k === a || k.startsWith(a + '/')) nodes.delete(k);
        return;
      }
      nodes.delete(a);
    },
    renameSync(from, to) {
      const a = abs(from);
      const n = nodes.get(a);
      if (!n) throw fsError('ENOENT', 'rename', from, to);
      if (!nodes.has(path.dirname(abs(to)))) throw fsError('ENOENT', 'rename', from, to);
      nodes.set(abs(to), n);
      nodes.delete(a);
    },
    copyFileSync(from, to) {
      const n = nodes.get(abs(from));
      if (!n) throw fsError('ENOENT', 'copyfile', from, to);
      if (n.type === 'dir') throw fsError('EISDIR', 'copyfile', from, to);
      api.writeFileSync(to, n.data);
    },
  };

  const names = ['stat', 'access', 'readFile', 'writeFile', 'appendFile', 'mkdir', 'readdir', 'unlink', 'rmdir', 'rm', 'rename', 'copyFile'];
  const out = { ...api, promises: {}, constants: { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 } };
  for (const name of names) {
    const sync = api[`${name}Sync`];
    out[name] = (...args) => {
      const cb = typeof args[args.length - 1] === 'function' ? args.pop() : () => {};
      let err = null;
      let res;
      try { res = sync(...args); } catch (e) { err = e; }
      later(() => (err ? cb(err) : name === 'readFile' || name === 'readdir' || name === 'stat' || name === 'mkdir' ? cb(null, res) : cb(null)));
    };
    out.promises[name] = (...args) => new Promise((resolve, reject) => {
      later(() => {
        try { resolve(sync(...args)); } catch (e) { reject(e); }
      });
    });
  }
  out.exists = (p, cb) => later(() => cb(api.existsSync(p)));
  out.__reset = () => { for (const k of [...nodes.keys()]) if (k !== '/' && k !== '/app') nodes.delete(k); };
  return out;
}
