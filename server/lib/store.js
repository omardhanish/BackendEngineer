// A tiny durable JSON store: atomic writes, per-file queues, corruption recovery, daily backups.
// Single-user, single-process by design (guarded by data/.lock). Plain files you can read and back up.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const todayStr = () => new Date().toISOString().slice(0, 10);

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true, mode: 0o700 });
  for (const ent of await fs.readdir(src, { withFileTypes: true })) {
    const s = join(src, ent.name);
    const d = join(dst, ent.name);
    if (ent.isDirectory()) await copyDir(s, d);
    else if (ent.isFile()) await fs.copyFile(s, d);
  }
}

export class Store {
  constructor(dir, { log } = {}) {
    this.dir = dir;
    this.log = log;
    this.cache = new Map();
    this.queues = new Map();
    this.seq = 0;
    this.lockPath = join(dir, '.lock');
  }

  async init({ backups = 7 } = {}) {
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    for (const sub of ['chats', 'notes']) await fs.mkdir(join(this.dir, sub), { recursive: true, mode: 0o700 });
    await this.#lock();
    await this.#backup(backups);
  }

  async #lock() {
    try {
      const { pid } = JSON.parse(await fs.readFile(this.lockPath, 'utf8'));
      if (pid && pid !== process.pid) {
        let alive = true;
        try { process.kill(pid, 0); } catch (e) { alive = e.code === 'EPERM'; }
        if (alive) throw new Error(`Another BackendEngineer server (pid ${pid}) is already using ${this.dir}. Stop it first.`);
      }
    } catch (e) {
      if (e.message.startsWith('Another')) throw e;
      /* no lock, or unreadable lock: take it */
    }
    await fs.writeFile(this.lockPath, JSON.stringify({ pid: process.pid, startedAt: Date.now() }), { mode: 0o600 });
  }

  async close() {
    await this.drain();
    try {
      const { pid } = JSON.parse(await fs.readFile(this.lockPath, 'utf8'));
      if (pid === process.pid) await fs.unlink(this.lockPath);
    } catch { /* already gone */ }
  }

  async #backup(keep) {
    const root = join(this.dir, '.backups');
    const dest = join(root, todayStr());
    try { await fs.access(dest); return; } catch { /* not yet today */ }
    try {
      await fs.mkdir(dest, { recursive: true, mode: 0o700 });
      for (const name of ['chats', 'notes']) await copyDir(join(this.dir, name), join(dest, name));
      for (const f of ['progress.json', 'usage.json']) await fs.copyFile(join(this.dir, f), join(dest, f)).catch(() => {});
      const all = (await fs.readdir(root)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
      for (const old of all.slice(0, Math.max(0, all.length - keep))) await fs.rm(join(root, old), { recursive: true, force: true });
    } catch (e) {
      this.log?.warn(`backup skipped: ${e.message}`);
    }
  }

  #path(rel) {
    if (rel.includes('..') || rel.startsWith('/') || rel.includes('\0')) throw new Error('bad store path');
    return join(this.dir, rel);
  }

  async #load(rel, fallback) {
    const file = this.#path(rel);
    const parse = async (f) => JSON.parse(await fs.readFile(f, 'utf8'));
    try {
      return await parse(file);
    } catch (e) {
      if (e.code === 'ENOENT') return structuredClone(fallback);
      if (!(e instanceof SyntaxError)) throw e;
      const quarantined = `${file}.corrupt-${Date.now()}`;
      await fs.rename(file, quarantined).catch(() => {});
      this.log?.error(`corrupt data file ${rel} moved to ${quarantined}; trying backup`);
      try { return await parse(`${file}.bak`); } catch { return structuredClone(fallback); }
    }
  }

  async #write(rel, obj) {
    const file = this.#path(rel);
    const tmp = `${file}.tmp-${process.pid}-${++this.seq}`;
    const fh = await fs.open(tmp, 'w', 0o600);
    try {
      await fh.writeFile(JSON.stringify(obj));
      await fh.sync();
    } finally {
      await fh.close();
    }
    await fs.copyFile(file, `${file}.bak`).catch((e) => { if (e.code !== 'ENOENT') throw e; });
    await fs.rename(tmp, file);
  }

  #enqueue(rel, task) {
    const prev = this.queues.get(rel) || Promise.resolve();
    const next = prev.then(task, task);
    this.queues.set(rel, next.catch(() => {}));
    return next;
  }

  async read(rel, fallback) {
    if (this.cache.has(rel)) return structuredClone(this.cache.get(rel));
    const val = await this.#enqueue(rel, async () => {
      if (!this.cache.has(rel)) this.cache.set(rel, await this.#load(rel, fallback));
      return this.cache.get(rel);
    });
    return structuredClone(val);
  }

  /** Read-modify-write under the per-file lock. `fn` mutates the draft and may return a value. */
  async update(rel, fn, fallback) {
    return this.#enqueue(rel, async () => {
      const cur = this.cache.has(rel) ? this.cache.get(rel) : await this.#load(rel, fallback);
      const draft = structuredClone(cur);
      const result = await fn(draft);
      await this.#write(rel, draft);
      this.cache.set(rel, draft);
      return result;
    });
  }

  async list(sub) {
    try {
      return (await fs.readdir(join(this.dir, sub))).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  async drain() {
    await Promise.all([...this.queues.values()]);
  }
}
