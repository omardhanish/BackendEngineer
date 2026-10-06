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
  book: null, // manifest from /api/book
  progress: { topics: {}, last: null },
  health: null,
  topic: null, // currently open topic (public JSON)
};

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
