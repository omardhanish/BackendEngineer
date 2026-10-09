// Reading progress: optimistic local update, debounced server save (server is the source of truth).
import { api } from './api.js';
import { state, emit } from './state.js';
import { debounce } from './ui.js';

const savers = new Map();

function save(id, patch) {
  const slug = state.slug; // a save belongs to the book that was open when it was made, even if you switch books within the delay
  const key = `${slug}/${id}`;
  let s = savers.get(key);
  if (!s) {
    const acc = {};
    s = { acc, run: debounce(async () => {
      const body = { ...acc };
      for (const k of Object.keys(acc)) delete acc[k];
      try { await api.patchProgress(id, body, slug); } catch { /* offline: the optimistic copy stays until reload */ }
    }, 600) };
    savers.set(key, s);
  }
  const { solved, ...rest } = patch;
  Object.assign(s.acc, rest);
  if (solved) s.acc.solved = { ...(s.acc.solved || {}), ...solved };
  s.run();
}

/** `slug`: the book the caller belongs to. A late callback (a test run that finishes after the reader switched book) must not write into the new book, where page ids repeat. */
export function patchProgress(id, patch, slug = state.slug) {
  if (slug !== state.slug) return;
  const t = (state.progress.topics[id] ??= {});
  const now = Date.now();
  if (patch.visited && !t.visited) t.visited = now;
  if (typeof patch.done === 'boolean') t.done = patch.done ? t.done || now : null;
  if (Number.isInteger(patch.frame)) t.frame = patch.frame;
  if (patch.solved) { t.solved ??= {}; for (const [k, v] of Object.entries(patch.solved)) { if (v) { if (!Object.hasOwn(t.solved, k)) t.solved[k] = now; } else delete t.solved[k]; } }
  state.progress.last = { id, frame: t.frame ?? 0, ts: now };
  emit('progress');
  save(id, patch);
}

export function flushProgress() {
  for (const s of savers.values()) if (Object.keys(s.acc).length) s.run.flush(); // an empty PATCH would still move "continue reading"
}
window.addEventListener('pagehide', flushProgress);
