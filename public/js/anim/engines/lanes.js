// "Lanes" engine: tokens that move between named lanes (stacks, queues, background areas).
// Event loop, promises, queues, request backlogs. Each step lists the full contents of every lane,
// so go(i) is a pure function of i; tokens glide between lanes with FLIP animation.
//
// scenario = {
//   code?: string[],                         // optional code panel, lines highlighted by step.line
//   lanes: [{id, label, kind?: 'stack'|'queue'|'area', hint?}],
//   tokens: { id: {label, tone?: 'sync'|'timer'|'micro'|'macro'|'io'|'neutral'} },
//   steps: [{caption, line?: number|number[], at: {laneId: [tokenId, ...]}, active?: string, out?: string[]}]
// }
import { h, icon } from '../../ui.js';

export function mount(host, { props: sc, reduced }) {
  const steps = sc.steps;
  const tokens = sc.tokens || {};
  const chips = new Map();
  const bodies = new Map();
  const lineEls = [];
  let shownOut = 0;

  const code = sc.code?.length
    ? h('div', { class: 'lanes-code', 'aria-hidden': 'true' },
      h('div', { class: 'eng-label' }, 'Code'),
      sc.code.map((ln, i) => { const el = h('div', { class: 'cl' }, h('span', { class: 'cl-n' }, i + 1), h('code', null, ln)); lineEls.push(el); return el; }))
    : null;

  const laneEls = sc.lanes.map((l) => {
    const body = h('div', { class: 'lane-body' });
    bodies.set(l.id, body);
    return h('div', { class: `lane lane-${l.kind || 'queue'}`, dataset: { lane: l.id } },
      h('div', { class: 'lane-head' }, h('span', { class: 'lane-name' }, l.label), l.hint ? h('span', { class: 'lane-hint' }, l.hint) : null), body);
  });
  const outEl = h('div', { class: 'console-lines' });
  const root = h('div', { class: `lanes${code ? ' has-code' : ''}` }, code,
    h('div', { class: 'lanes-main' },
      h('div', { class: 'lanes-grid', style: { '--cols': Math.min(sc.lanes.length, 4) } }, laneEls),
      h('div', { class: 'console' }, h('div', { class: 'eng-label' }, icon('terminal', 13), 'Console'), outEl)));
  host.append(root);

  const dur = reduced ? 0 : 380;
  const chipFor = (id) => {
    let el = chips.get(id);
    if (!el) {
      const t = tokens[id] || { label: id };
      el = h('div', { class: `tok tone-${t.tone || 'neutral'}`, dataset: { id } }, t.label);
      chips.set(id, el);
    }
    return el;
  };

  function go(i) {
    const step = steps[i];
    const hostRect = host.getBoundingClientRect();
    const first = new Map();
    for (const [id, el] of chips) if (el.isConnected) first.set(id, el.getBoundingClientRect());

    const present = new Set();
    for (const lane of sc.lanes) {
      const body = bodies.get(lane.id);
      for (const id of step.at?.[lane.id] || []) {
        present.add(id);
        const el = chipFor(id);
        el.classList.remove('is-leaving');
        body.append(el);
      }
    }
    // chips that left the picture fade out as ghosts at their old position
    for (const [id, el] of chips) {
      if (present.has(id) || !el.isConnected) continue;
      const r = first.get(id);
      el.remove();
      if (r && dur) {
        const ghost = el.cloneNode(true);
        Object.assign(ghost.style, { position: 'absolute', left: `${r.left - hostRect.left}px`, top: `${r.top - hostRect.top}px`, width: `${r.width}px`, margin: '0', pointerEvents: 'none', zIndex: '5' });
        host.append(ghost);
        ghost.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.85)' }], { duration: 220, easing: 'ease-out' }).finished.then(() => ghost.remove(), () => ghost.remove());
      }
    }
    // FLIP: invert to the old position, then play to the new one
    for (const id of present) {
      const el = chips.get(id);
      el.classList.toggle('is-active', step.active === id || (Array.isArray(step.active) && step.active.includes(id)));
      if (!dur) continue;
      const f = first.get(id);
      const l = el.getBoundingClientRect();
      if (f) {
        const dx = f.left - l.left;
        const dy = f.top - l.top;
        if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.22,1,.36,1)' });
      } else {
        el.animate([{ opacity: 0, transform: 'scale(.8) translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
    // code highlight
    const lines = Array.isArray(step.line) ? step.line : step.line != null ? [step.line] : [];
    lineEls.forEach((el, n) => el.classList.toggle('is-on', lines.includes(n)));
    // console
    const out = step.out || [];
    outEl.replaceChildren(...(out.length ? out.map((t, n) => h('div', { class: `cline${n >= shownOut && n >= out.length - 1 ? ' is-new' : ''}` }, h('span', { class: 'cline-p' }, '›'), t)) : [h('div', { class: 'cline is-empty' }, 'nothing printed yet')]));
    shownOut = out.length;
  }

  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { chips.clear(); bodies.clear(); host.replaceChildren(); } };
}
