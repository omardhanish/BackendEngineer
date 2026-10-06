// "Pipeline" engine: something travels through ordered stages and (optionally) comes back.
// Middleware chains, request → controller → model, Mongo aggregation, SQL clause order, multi-stage builds.
// Each stage has a top slot (going in / "before next()") and a bottom slot (coming back / "after next()").
//
// scenario = {
//   stages: [{id, label, sub?, kind?: 'end'}],
//   token: {label, tone?: 'req'|'ok'|'err'},               // default token
//   steps: [{caption, at: stageId, slot?: 'top'|'bottom', state?: {stageId: 'active'|'done'|'blocked'|'error'},
//            token?: {label, tone}, out?: string[]}]
// }
import { h, icon } from '../../ui.js';

export function mount(host, { props: sc, reduced }) {
  const steps = sc.steps;
  const stageEls = new Map();
  const slotEls = new Map();
  let shownOut = 0;

  const stageNodes = sc.stages.map((st, i) => {
    const top = h('div', { class: 'pslot pslot-top' }, st.kind === 'end' ? null : h('span', null, 'before'));
    const bottom = h('div', { class: 'pslot pslot-bottom' }, st.kind === 'end' ? null : h('span', null, 'after'));
    slotEls.set(st.id, { top, bottom });
    const el = h('div', { class: `stage-box${st.kind === 'end' ? ' is-end' : ''}`, dataset: { id: st.id } },
      top, h('div', { class: 'stage-name' }, h('b', null, st.label), st.sub ? h('small', null, st.sub) : null), bottom);
    stageEls.set(st.id, el);
    return i < sc.stages.length - 1 ? [el, h('div', { class: 'pipe-link', 'aria-hidden': 'true' })] : [el];
  }).flat();

  const token = h('div', { class: 'ptoken tone-req' }, sc.token?.label || 'request');
  const track = h('div', { class: 'pipe-track' }, stageNodes, token);
  const outEl = h('div', { class: 'console-lines' });
  const hasOut = steps.some((s) => s.out);
  const root = h('div', { class: 'pipe' }, track, hasOut ? h('div', { class: 'console' }, h('div', { class: 'eng-label' }, icon('terminal', 13), 'Order of execution'), outEl) : null);
  host.append(root);
  token.style.transitionDuration = reduced ? '0ms' : '';

  function place(stageId, slot) {
    const s = slotEls.get(stageId)?.[slot === 'bottom' ? 'bottom' : 'top'];
    if (!s) return;
    const tr = track.getBoundingClientRect();
    const r = s.getBoundingClientRect();
    token.style.transform = `translate(${Math.round(r.left - tr.left + r.width / 2)}px, ${Math.round(r.top - tr.top + r.height / 2)}px) translate(-50%, -50%)`;
  }

  let lastStep = 0;
  function go(i) {
    lastStep = i;
    const step = steps[i];
    for (const [id, el] of stageEls) el.dataset.state = step.state?.[id] || '';
    const tk = step.token || sc.token || {};
    token.textContent = tk.label || sc.token?.label || 'request';
    token.className = `ptoken tone-${tk.tone || 'req'}`;
    place(step.at, step.slot);
    const out = step.out || [];
    if (hasOut) {
      outEl.replaceChildren(...(out.length ? out.map((t, n) => h('div', { class: `cline${n >= shownOut && n >= out.length - 1 ? ' is-new' : ''}` }, h('span', { class: 'cline-p' }, '›'), t)) : [h('div', { class: 'cline is-empty' }, 'nothing has run yet')]));
      shownOut = out.length;
    }
  }

  // keep the token glued to its slot when the figure resizes
  const ro = new ResizeObserver(() => { token.style.transitionDuration = '0ms'; go(lastStep); requestAnimationFrame(() => { token.style.transitionDuration = reduced ? '0ms' : ''; }); });
  ro.observe(track);

  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { ro.disconnect(); host.replaceChildren(); } };
}
