// The library: every folder under content/books/ that holds a book.json and a syllabus.json is one book.
// A book's runtime = its content loader + its own chat store (a path prefix inside the data store).
// Slugs only ever reach the file system through this registry (a Map), never straight from a URL.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { BOOK_RE } from './security.js';
import { Content } from './content.js';
import { Chats } from './chats.js';
import { normalizeBook } from './book-meta.js';

const RESCAN_MS = 2000;
const BLANK_PROGRESS = { v: 1, topics: {}, last: null };

export class Library {
  constructor(config, { store, log } = {}) {
    this.dir = config.booksDir;
    this.preferred = config.defaultBook;
    this.store = store;
    this.log = log;
    this.books = new Map(); // slug -> runtime
    this.problems = new Map(); // slug -> message (a broken book never takes the server down)
    this.scannedAt = 0;
    this.scanning = null;
  }

  async load() {
    await this.#scan(true);
    return this;
  }

  /** Pick up new, changed or removed books without a restart (a freshly generated book shows up on its own). */
  async #scan(force = false) {
    if (!force && Date.now() - this.scannedAt < RESCAN_MS) return;
    if (this.scanning) return this.scanning;
    this.scanning = (async () => {
      try {
        let entries = [];
        try { entries = await fs.readdir(this.dir, { withFileTypes: true }); } catch { /* no books folder yet */ }
        const seen = new Set();
        for (const ent of entries) {
          if (!ent.isDirectory() || !BOOK_RE.test(ent.name)) continue;
          const slug = ent.name;
          const dir = join(this.dir, slug);
          let stamp;
          try {
            const [b, s] = await Promise.all([fs.stat(join(dir, 'book.json')), fs.stat(join(dir, 'syllabus.json'))]);
            stamp = `${b.mtimeMs}:${s.mtimeMs}`;
          } catch { continue; } // not a book (yet)
          seen.add(slug);
          const have = this.books.get(slug);
          if (have && have.stamp === stamp) continue;
          try {
            const meta = normalizeBook(JSON.parse(await fs.readFile(join(dir, 'book.json'), 'utf8')), slug);
            const content = await new Content(dir, { log: this.log, meta }).load();
            let chats = have?.chats;
            if (!chats) {
              chats = new Chats(this.store, { log: this.log, prefix: `books/${slug}/`, title: meta.title });
              await chats.init();
            } else chats.title = meta.title;
            this.books.set(slug, { slug, dir, meta, content, chats, prefix: `books/${slug}/`, stamp });
            this.problems.delete(slug);
          } catch (e) {
            if (!this.problems.has(slug)) this.log?.warn(`book "${slug}" skipped: ${e.message}`);
            this.problems.set(slug, e.message);
          }
        }
        for (const slug of [...this.books.keys()]) if (!seen.has(slug)) this.books.delete(slug);
      } finally {
        this.scannedAt = Date.now();
        this.scanning = null;
      }
    })();
    return this.scanning;
  }

  /** @returns the runtime of a book, or null. `slug` must already look like a slug. */
  async get(slug) {
    if (typeof slug !== 'string' || !BOOK_RE.test(slug)) return null;
    await this.#scan();
    return this.books.get(slug) ?? null;
  }

  async defaultSlug() {
    await this.#scan();
    if (this.books.has(this.preferred)) return this.preferred;
    return [...this.books.values()].sort((a, b) => a.meta.order - b.meta.order || a.meta.title.localeCompare(b.meta.title))[0]?.slug ?? null;
  }

  /** Cards for the library page: identity, size and this reader's progress in each book. */
  async list() {
    await this.#scan();
    const out = [];
    for (const bk of this.books.values()) {
      const m = await bk.content.manifest();
      const ids = new Set(m.topics.map((t) => t.id));
      const progress = await this.store.read(`${bk.prefix}progress.json`, BLANK_PROGRESS);
      const mine = Object.entries(progress.topics || {}).filter(([id]) => ids.has(id));
      const last = progress.last && ids.has(progress.last.id)
        ? { id: progress.last.id, title: bk.content.titleOf(progress.last.id), frame: progress.last.frame ?? 0, ts: progress.last.ts ?? 0 }
        : null;
      out.push({
        slug: bk.slug, title: bk.meta.title, tagline: bk.meta.tagline, audience: bk.meta.audience, hue: bk.meta.hue,
        monogram: bk.meta.monogram, profile: bk.meta.profile, order: bk.meta.order,
        chapters: m.chapters.length, pages: m.topics.length, authored: m.authored,
        done: mine.filter(([, t]) => t.done).length, visited: mine.filter(([, t]) => t.visited).length, last,
      });
    }
    return out.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  }
}
