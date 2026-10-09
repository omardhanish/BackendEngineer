// App state: manifest, progress, preferences. A tiny pub/sub keeps views decoupled.
const subs = new Map();
export function on(event, fn) {
  if (!subs.has(event)) subs.set(event, new Set());
  subs.get(event).add(fn);
  return () => subs.get(event).delete(fn);
}
export function emit(event, data) {
  for (const fn of subs.get(event) || []) {
    try { fn(data); } catch (e) { console.error(e); }
  }
}

const ls = {
  get(k) { try { return localStorage.getItem(`be:${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`be:${k}`, v); } catch { /* private mode: preferences simply don't persist */ } },
};

const DEFAULTS = { theme: 'system', motion: 'system', dock: null, tocOpen: '{}' };

export const state = {
  library: [], // the books, with this reader's progress in each (GET /api/books)
  defaultSlug: null, // the book the original /read/... URLs mean
  slug: null, // the book being read right now
  book: null, // manifest of the CURRENT book (GET /api/books/:slug/book)
  progress: { topics: {}, last: null }, // progress in the CURRENT book
  health: null,
  topic: null, // currently open topic (public JSON)
};

/** A preference that belongs to one book (e.g. which chapters are open). The old unscoped key still works for the default book. */
export function bookPref(key, value) {
  const k = `${state.slug}:${key}`;
  if (value === undefined) return ls.get(k) ?? (state.slug === state.defaultSlug ? ls.get(key) : null) ?? DEFAULTS[key];
  ls.set(k, value);
  return value;
}
/** Browser-storage key for something that belongs to one page of the CURRENT book (a code draft, rubric marks). */
export const pageKey = (kind, ...id) => `be:${kind}:${state.slug}:${id.join(':')}`;
/** The same thing before there were several books. Still read for the default book, so nothing a reader typed is lost. */
export const legacyPageKey = (kind, ...id) => (state.slug === state.defaultSlug ? `be:${kind}:${id.join(':')}` : null);
/** The hue a book starts from, remembered so the NEXT page load paints the right colour before any script runs (see prepaint.js). */
export const rememberHue = (slug, hue) => ls.set(`hue:${slug}`, String(hue));

export function pref(key, value) {
  if (value === undefined) return ls.get(key) ?? DEFAULTS[key];
  ls.set(key, value);
  emit('pref', { key, value });
  return value;
}

// ---- derived helpers used by many views
export const chapterOf = (id) => state.book.chapters.find((c) => c.id === id);
export const topicMeta = (id) => state.book.topics.find((t) => t.id === id);
export const topicsOf = (chapterId) => state.book.topics.filter((t) => t.chapter === chapterId);
export const isDone = (id) => !!state.progress.topics[id]?.done;
export const isVisited = (id) => !!state.progress.topics[id]?.visited;

export function chapterStats(chapterId) {
  const ts = topicsOf(chapterId);
  return { total: ts.length, written: ts.filter((t) => t.authored).length, done: ts.filter((t) => isDone(t.id)).length, visited: ts.filter((t) => isVisited(t.id)).length };
}

export function overallStats() {
  const ts = state.book.topics;
  return { total: ts.length, written: ts.filter((t) => t.authored).length, done: ts.filter((t) => isDone(t.id)).length };
}
