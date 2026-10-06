// Reading progress: optimistic local update, debounced server save (server is the source of truth).
import { api } from './api.js';
import { state, emit } from './state.js';
import { debounce } from './ui.js';

const savers = new Map();

function save(id, patch) {
  let s = savers.get(id);
  if (!s) {
    const acc = {};
    s = { acc, run: debounce(async () => {
      const body = { ...acc };
      for (const k of Object.keys(acc)) delete acc[k];
      try { await api.patchProgress(id, body); } catch { /* offline: the optimistic copy stays until reload */ }
    }, 600) };
    savers.set(id, s);
  }
  const { solved, ...rest } = patch;
  Object.assign(s.acc, rest);
  if (solved) s.acc.solved = { ...(s.acc.solved || {}), ...solved };
  s.run();
}

export function patchProgress(id, patch) {
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
  for (const s of savers.values()) s.run.flush();
}
window.addEventListener('pagehide', flushProgress);
