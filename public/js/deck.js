// The deck: frame navigation for one page (head, body, foot), animated frame swaps, end card, progress.
// → steps the visible animation first, then moves to the next frame; the last frame opens an end card
// (never a silent jump to another page).
import { h, icon, reducedMotion, rich } from './ui.js';
import { patchProgress } from './progress.js';
import { navigate } from './router.js';
import { paths } from './paths.js';
import { state } from './state.js';

const KIND = { roleplay: 'Role-play', challenge: 'Challenge', bonus: 'Bonus' };
const short = (s, n = 34) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function createDeck({ topic, frames, startAt = 0, ctx }) {
  const slug = state.slug; // progress made here belongs to this book even if the reader has moved on
  const root = document.documentElement;
  let i = -1;
  let cur = null;
  let token = 0;
  let alive = true;
  let unsub = null;

  const headRight = h('div', { class: 'sh-right' });
  const head = h('div', { class: 'stage-head' },
    h('div', { class: 'sh-left' }, h('span', { class: 'sh-page' }, `Page ${topic.position.index} of ${topic.position.total}`), KIND[topic.kind] ? h('span', { class: `badge badge-${topic.kind}` }, KIND[topic.kind]) : null),
    headRight);
  const body = h('div', { class: 'stage-body', tabindex: '-1' });
  const prevBtn = h('button', { class: 'btn', type: 'button', onclick: () => prev() });
  const nextBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => next() });
  const dots = h('div', { class: 'deck-dots', role: 'tablist', 'aria-label': 'Frames' },
    frames.map((f, k) => h('button', { class: 'deck-dot', type: 'button', role: 'tab', 'aria-label': f.label, title: f.label, onclick: () => show(k, k > i ? 'fwd' : 'back') })));
  const foot = h('div', { class: 'stage-foot' }, prevBtn, frames.length > 1 ? dots : h('span'), nextBtn);
  const el = h('div', { class: 'deck' }, head, body, foot);

  function endCard() {
    const nx = topic.next;
    const card = h('section', { class: 'frame frame-end', 'aria-label': 'Page complete' },
      h('div', { class: 'end-badge', 'aria-hidden': 'true' }, icon('check', 26)),
      h('p', { class: 'eyebrow' }, 'Page complete'),
      h('h2', { class: 'end-title' }, topic.title),
      topic.takeaway ? h('p', { class: 'end-take' }, h('b', null, 'Remember: '), rich(topic.takeaway)) : null,
      h('div', { class: 'end-actions' },
        nx ? h('a', { class: 'btn btn-primary btn-lg', href: paths.read(nx.id) }, h('span', null, 'Next: ', short(nx.title, 44)), icon('arrow-right', 18)) : h('a', { class: 'btn btn-primary btn-lg', href: paths.book() }, 'Back to the book'),
        h('a', { class: 'btn', href: paths.chapter(topic.chapter.id) }, 'Chapter overview'),
        h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => ctx.openChat() }, icon('chat', 16), 'Ask the tutor')));
    return { el: card };
  }

  function swap(newEl, dir) {
    const apply = () => { body.replaceChildren(newEl); body.scrollTop = 0; };
    if (cur && !reducedMotion() && typeof document.startViewTransition === 'function' && body.isConnected) {
      root.dataset.dir = dir;
      const vt = document.startViewTransition(apply);
      vt.finished.catch(() => {}).finally(() => { delete root.dataset.dir; });
    } else {
      apply();
      newEl.classList.add('enter');
    }
  }

  function paint() {
    const isEnd = i === frames.length;
    headRight.replaceChildren(h('span', { class: 'sh-frame' }, isEnd ? 'Done' : frames[i].label), isEnd ? null : h('span', { class: 'sh-count' }, `${i + 1} / ${frames.length}`));
    dots.querySelectorAll('.deck-dot').forEach((d, k) => { d.classList.toggle('is-on', k === i); d.classList.toggle('is-past', k < i); d.setAttribute('aria-selected', String(k === i)); });
    const st = cur?.stepper;
    const atVeryStart = i === 0 && !(st && st.index > 0);
    prevBtn.replaceChildren(icon('arrow-left', 16), h('span', null, atVeryStart ? 'Previous page' : 'Back'));
    prevBtn.disabled = atVeryStart && !topic.prev;
    let label;
    if (st && st.index < st.count - 1) label = 'Next step';
    else if (isEnd) label = topic.next ? 'Next page' : 'Bookshelf';
    else label = i === frames.length - 1 ? 'Finish page' : `Next: ${frames[i + 1].label}`;
    nextBtn.replaceChildren(h('span', null, label), icon('arrow-right', 16));
  }

  async function show(k, dir = 'fwd', { toEnd = false } = {}) {
    k = Math.max(0, Math.min(frames.length, k));
    const my = ++token;
    let built;
    try {
      built = k === frames.length ? endCard() : await frames[k].build(ctx);
    } catch (e) {
      console.error(e);
      built = { el: h('section', { class: 'frame frame-error' }, h('h2', null, 'This frame could not be drawn'), h('p', { class: 'muted' }, e.message)) };
    }
    if (!alive || my !== token) { built.destroy?.(); return; }
    const old = cur;
    unsub?.();
    cur = built;
    i = k;
    if (toEnd && built.stepper) built.stepper.go(built.stepper.count - 1);
    swap(built.el, dir);
    old?.destroy?.();
    unsub = built.stepper?.subscribe(paint) || null;
    paint();
    ctx.setLive({ error: '' });
    ctx.refresh = paint;
    patchProgress(topic.id, { frame: Math.min(k, frames.length - 1), ...(k === frames.length ? { done: true } : {}) }, slug);
    history.replaceState({}, '', paths.read(topic.id, k === 0 ? undefined : k + 1));
  }

  const goTopic = (t) => { navigate(t ? paths.read(t.id) : paths.book()); return true; };

  function next() {
    if (cur?.stepper?.next()) return true;
    if (i < frames.length) { show(i + 1, 'fwd'); return true; }
    return goTopic(topic.next);
  }
  function prev() {
    if (cur?.stepper?.prev()) return true;
    if (i > 0) { show(i - 1, 'back', { toEnd: true }); return true; }
    if (topic.prev) return goTopic(topic.prev);
    return false;
  }

  function keydown(e) {
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) return false;
    if (cur?.onKey?.(e)) return true;
    switch (e.key) {
      case 'ArrowRight': return next();
      case 'ArrowLeft': return prev();
      case ' ':
        if (e.target instanceof Element && e.target.closest('button, a, summary, [role="button"]')) return false;
        return e.shiftKey ? prev() : next();
      case 'PageDown': if (i < frames.length) { show(i + 1, 'fwd'); return true; } return false;
      case 'PageUp': if (i > 0) { show(i - 1, 'back'); return true; } return false;
      case 'p': case 'P': if (cur?.stepper) { cur.stepper.toggle(); return true; } return false;
      case ']': return goTopic(topic.next);
      case '[': return topic.prev ? goTopic(topic.prev) : false;
      default: return false;
    }
  }

  return {
    el, keydown, show: (k) => show(k, k >= i ? 'fwd' : 'back'),
    start: () => show(Math.min(Math.max(startAt, 0), frames.length), 'fwd'),
    live: () => ({ frame: i + 1, frameLabel: i < frames.length ? frames[i].label : 'Done', step: cur?.stepper ? cur.stepper.index + 1 : null }),
    destroy() { alive = false; token++; unsub?.(); cur?.destroy?.(); },
  };
}
