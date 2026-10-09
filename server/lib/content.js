// Content loader: syllabus + authored topic JSON + real code files (+ captured outputs).
// `content/` is never served statically; everything goes through the API, which also strips
// server-only role-play material.
import { promises as fs } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { ID_RE } from './security.js';

const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const RESCAN_MS = 1500;

/** One book: `dir` is content/books/<slug>/ (syllabus.json, <chapter>/<id>.json, code/<id>/, roleplay/<id>.key.json). */
export class Content {
  constructor(dir, { log, meta } = {}) {
    this.dir = dir;
    this.meta = meta || null; // validated book.json (see book-meta.js)
    this.log = log;
    this.syllabus = null;
    this.topicsById = new Map();
    this.chaptersById = new Map();
    this.order = [];
    this.authored = new Map(); // id -> { title, mtimeMs }
    this.scannedAt = 0;
    this.fileCache = new Map(); // path -> { mtimeMs, data }
  }

  async load() {
    this.syllabus = JSON.parse(await fs.readFile(join(this.dir, 'syllabus.json'), 'utf8'));
    // ids become file names, so a syllabus (it may come from an imported or generated book) is checked before it is trusted
    for (const c of this.syllabus.chapters) {
      if (!ID_RE.test(String(c.id)) || this.chaptersById.has(c.id)) throw new Error(`syllabus: bad or repeated chapter id "${c.id}"`);
      this.chaptersById.set(c.id, c);
    }
    this.order = this.syllabus.topics.map((t) => t.id);
    for (const t of this.syllabus.topics) {
      if (!ID_RE.test(String(t.id)) || this.topicsById.has(t.id) || !this.chaptersById.has(t.chapter)) throw new Error(`syllabus: bad, repeated or orphaned topic id "${t.id}"`);
      this.topicsById.set(t.id, t);
    }
    await this.#scan(true);
    return this;
  }

  has(id) {
    return this.topicsById.has(id);
  }

  titleOf(id) {
    return this.authored.get(id)?.title || this.topicsById.get(id)?.source || id;
  }

  async #json(path) {
    const st = await fs.stat(path);
    const hit = this.fileCache.get(path);
    if (hit && hit.mtimeMs === st.mtimeMs) return hit.data;
    const data = JSON.parse(await fs.readFile(path, 'utf8'));
    this.fileCache.set(path, { mtimeMs: st.mtimeMs, data });
    return data;
  }

  async #scan(force = false) {
    if (!force && Date.now() - this.scannedAt < RESCAN_MS) return;
    this.scannedAt = Date.now();
    const next = new Map();
    for (const c of this.syllabus.chapters) {
      let names = [];
      try { names = await fs.readdir(join(this.dir, c.id)); } catch { continue; }
      for (const n of names) {
        if (!n.endsWith('.json')) continue;
        const id = n.slice(0, -5);
        if (!this.topicsById.has(id)) continue;
        try {
          const j = await this.#json(join(this.dir, c.id, n));
          next.set(id, { title: typeof j.title === 'string' ? j.title : null });
        } catch (e) {
          this.log?.warn(`content ${id}: ${e.message}`);
        }
      }
    }
    this.authored = next;
  }

  /** Lightweight index for the sidebar, home page and palette. */
  async manifest() {
    await this.#scan();
    const chapters = this.syllabus.chapters.map((c) => ({
      id: c.id, n: c.n, title: c.title, tagline: c.tagline, outcomes: c.outcomes, hue: c.hue, topics: c.topics,
    }));
    const topics = this.syllabus.topics.map((t) => ({
      id: t.id, chapter: t.chapter, n: t.n, kind: t.kind, depth: t.depth, lecture: t.lecture ?? null,
      title: this.authored.get(t.id)?.title || t.source, authored: this.authored.has(t.id),
    }));
    const m = this.meta;
    return {
      version: this.syllabus.version,
      book: m ? { slug: m.slug, title: m.title, tagline: m.tagline, hue: m.hue, monogram: m.monogram, profile: m.profile } : null,
      chapters, topics, authored: this.authored.size,
    };
  }

  #neighbor(i) {
    const id = this.order[i];
    if (!id) return null;
    const t = this.topicsById.get(id);
    return { id, title: this.authored.get(id)?.title || t.source };
  }

  async #readCode(id, ref) {
    if (!ref || typeof ref.file !== 'string' || !SAFE_FILE.test(ref.file)) return { ...ref, source: '', missing: true };
    const base = resolve(this.dir, 'code', id);
    const path = resolve(base, ref.file);
    if (!path.startsWith(base + sep)) return { ...ref, source: '', missing: true };
    const out = { ...ref };
    // a symlink inside a book (a cloned or unzipped one) must not lead out of its code folder
    const inside = async (p) => {
      // the book's whole code/ folder is the boundary (not code/<id>, which could itself be the link)
      const [realRoot, real] = await Promise.all([fs.realpath(join(this.dir, 'code')), fs.realpath(p)]);
      if (!real.startsWith(realRoot + sep)) throw new Error('outside the code folder');
      return real;
    };
    try {
      out.source = await fs.readFile(await inside(path), 'utf8');
    } catch {
      return { ...ref, source: '', missing: true };
    }
    try {
      const cap = await this.#json(await inside(`${path}.out.json`));
      out.captured = { stdout: cap.stdout ?? '', stderr: cap.stderr ?? '', node: cap.node ?? null, tool: cap.tool ?? null, command: typeof cap.command === 'string' ? cap.command : null };
    } catch { /* not captured (yet), or not a file of this book */ }
    return out;
  }

  /** Private view (includes role-play key material) — only the server's prompt builder may use this. */
  async topicPrivate(id) {
    const meta = this.topicsById.get(id);
    if (!meta) return null;
    const chapter = this.chaptersById.get(meta.chapter);
    let body = null;
    try { body = await this.#json(join(this.dir, meta.chapter, `${id}.json`)); } catch { /* not authored yet */ }
    let roleplay = null;
    if (meta.kind === 'roleplay') {
      try { roleplay = await this.#json(join(this.dir, 'roleplay', `${id}.key.json`)); } catch { /* none yet */ }
    }
    const index = this.order.indexOf(id);
    const code = body?.code ? await Promise.all(body.code.map((c) => this.#readCode(id, c))) : [];
    if (body?.challenges?.items) {
      const read = async (it, key) => (typeof it[key] === 'string' ? (await this.#readCode(id, { file: it[key] })).source || '' : '');
      body = { ...body, challenges: { ...body.challenges, items: await Promise.all(body.challenges.items.map(async (it) => ({ ...it, starterSource: await read(it, 'starter'), testsSource: await read(it, 'tests'), solutionSource: await read(it, 'solution') }))) } };
    }
    return {
      id, kind: meta.kind, depth: meta.depth, n: meta.n, lecture: meta.lecture ?? null, source: meta.source,
      book: this.meta ? { slug: this.meta.slug, title: this.meta.title } : null,
      chapter: { id: chapter.id, n: chapter.n, title: chapter.title, hue: chapter.hue },
      authored: !!body, title: body?.title || meta.source,
      ...(body || {}), code,
      prev: this.#neighbor(index - 1), next: this.#neighbor(index + 1),
      position: { index: index + 1, total: this.order.length },
      roleplay,
    };
  }

  /** Public view for the browser: no role-play keys. */
  async topic(id) {
    const t = await this.topicPrivate(id);
    if (!t) return null;
    const { roleplay, ...pub } = t;
    pub.hasRoleplay = !!roleplay;
    if (roleplay?.starters) pub.chat = { ...(pub.chat || {}), starters: roleplay.starters };
    return pub;
  }
}
