// "Memory" engine: code on the left, call stack in the middle, heap on the right.
// Execution contexts, closures, `this`, primitives vs references. Values are display strings;
// {ref:'o1'} points at a heap object (shown as a coloured chip matching the object's dot).
//
// scenario = {
//   code: string[],
//   steps: [{caption, line?: number, stack: [{name, vars: {k: string | {ref: id}}}],   // bottom → top
//            heap?: [{id, label, props?: {k: string | {ref}}}]}]
// }
import { h } from '../../ui.js';

const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];

export function mount(host, { props: sc }) {
  const steps = sc.steps;
  const lineEls = sc.code.map((ln, i) => h('div', { class: 'cl' }, h('span', { class: 'cl-n' }, i + 1), h('code', null, ln)));
  const stackEl = h('div', { class: 'mem-stack' });
  const heapEl = h('div', { class: 'mem-heap' });
  const refIndex = new Map();
  const colorOf = (id) => { if (!refIndex.has(id)) refIndex.set(id, COLORS[refIndex.size % COLORS.length]); return refIndex.get(id); };

  host.append(h('div', { class: 'mem' },
    h('div', { class: 'mem-col mem-code', 'aria-hidden': 'true' }, h('div', { class: 'eng-label' }, 'Code'), lineEls),
    h('div', { class: 'mem-col' }, h('div', { class: 'eng-label' }, 'Call stack', h('small', null, 'top runs first')), stackEl),
    h('div', { class: 'mem-col' }, h('div', { class: 'eng-label' }, 'Heap', h('small', null, 'objects live here')), heapEl)));

  const val = (v, changed) => {
    if (v && typeof v === 'object' && v.ref) return h('span', { class: `mv mv-ref${changed ? ' is-changed' : ''}`, style: { '--ref': colorOf(v.ref) }, title: `points to ${v.ref}` }, h('i', null), v.label || v.ref);
    const s = String(v);
    const kind = /^['"`]/.test(s) ? 'str' : /^-?\d/.test(s) ? 'num' : /^(true|false)$/.test(s) ? 'bool' : /^(undefined|null|<)/.test(s) ? 'nil' : /^ƒ|^function|^=>/.test(s) ? 'fn' : 'raw';
    return h('span', { class: `mv mv-${kind}${changed ? ' is-changed' : ''}` }, s);
  };

  function go(i) {
    const step = steps[i];
    const prev = steps[i - 1];
    lineEls.forEach((el, n) => el.classList.toggle('is-on', n === step.line));
    const prevStack = prev?.stack || [];
    const frames = step.stack.map((fr, depth) => {
      const before = prevStack[depth]?.name === fr.name ? prevStack[depth] : null;
      const rows = Object.entries(fr.vars || {}).map(([k, v]) => {
        const oldV = before?.vars?.[k];
        const changed = before ? JSON.stringify(oldV) !== JSON.stringify(v) : false;
        return h('div', { class: 'mrow' }, h('span', { class: 'mk' }, k), val(v, changed));
      });
      return h('div', { class: `mframe${before ? '' : ' is-new'}${depth === step.stack.length - 1 ? ' is-top' : ''}` }, h('div', { class: 'mframe-name' }, fr.name), rows.length ? rows : h('div', { class: 'mrow is-empty' }, 'no variables yet'));
    });
    stackEl.replaceChildren(...frames.reverse());
    heapEl.replaceChildren(...((step.heap || []).length ? step.heap.map((o) => h('div', { class: `mobj${prev?.heap?.some((p) => p.id === o.id) ? '' : ' is-new'}`, style: { '--ref': colorOf(o.id) } },
      h('div', { class: 'mobj-head' }, h('i', null), h('b', null, o.label || o.id), h('small', null, o.id)),
      Object.entries(o.props || {}).map(([k, v]) => h('div', { class: 'mrow' }, h('span', { class: 'mk' }, k), val(v)))))
      : [h('div', { class: 'mem-empty' }, 'empty')]));
  }

  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { host.replaceChildren(); } };
}
