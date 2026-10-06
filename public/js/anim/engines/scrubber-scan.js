// scrubber · scan — the same lookup done two ways: read every row, or walk an index.
// The engine builds a small B-tree from the rows (4 keys per leaf page) and counts the work for each method.
//
// scenario = {
//   kind: 'scan', table?: 'users', column?: 'email',
//   rows: [value…],                      // 8–16 short values in physical (unsorted) order
//   target: value,                       // the value being looked up; must be in rows
//   steps: [{caption, mode: 'seq', n}    // n rows read so far, 0…rows.length (a seq scan must read them all)
//         | {caption, mode: 'index', n}] // n = 0 nothing, 1 root page, 2 leaf page, 3 the table row
// }
import { h } from '../../ui.js';

const LEAF = 4;

export function mount(host, { props: sc }) {
  const steps = sc.steps;
  const rows = sc.rows;
  const target = sc.target;
  const sorted = [...rows].sort();
  const leaves = [];
  for (let i = 0; i < sorted.length; i += LEAF) leaves.push(sorted.slice(i, i + LEAF));
  const seps = leaves.slice(1).map((l) => l[0]);
  const leafIdx = leaves.findIndex((l) => l.includes(target));
  const rowIdx = rows.indexOf(target);

  const rowEls = rows.map((v, i) => h('li', { class: 'sx-row' }, h('span', { class: 'sx-id' }, i + 1), h('span', { class: 'sx-val' }, v)));
  const rootEl = h('div', { class: 'sx-page sx-root' }, h('span', { class: 'sx-lab' }, 'root'), h('div', { class: 'sx-keys' }, seps.map((k) => h('span', null, k))));
  const leafEls = leaves.map((l, k) => h('div', { class: 'sx-page sx-leaf' }, h('span', { class: 'sx-lab' }, `leaf ${k + 1}`), h('div', { class: 'sx-keys is-col' }, l.map((v) => h('span', { dataset: { v } }, v)))));
  const seqStat = h('b', null, '0');
  const idxStat = h('b', null, '0');

  host.append(h('div', { class: 'sx' },
    h('div', { class: 'sx-col' },
      h('div', { class: 'eng-label' }, `${sc.table || 'table'} · ${sc.column || 'column'}`, h('small', null, `find "${target}"`)),
      h('ol', { class: 'sx-rows' }, rowEls),
      h('div', { class: 'sx-stat' }, h('span', null, 'Rows read'), seqStat)),
    h('div', { class: 'sx-col' },
      h('div', { class: 'eng-label' }, 'Index (B-tree, simplified)'),
      h('div', { class: 'sx-tree' }, rootEl, h('div', { class: 'sx-leaves' }, leafEls)),
      h('div', { class: 'sx-stat' }, h('span', null, 'Pages read'), idxStat))));

  function go(i) {
    const st = steps[i];
    const seq = st.mode !== 'index';
    const n = Math.max(0, Math.min(st.n ?? 0, seq ? rows.length : 3));
    rowEls.forEach((el, k) => {
      const read = seq && k < n;
      el.classList.toggle('is-read', read);
      el.classList.toggle('is-now', seq && k === n - 1);
      el.classList.toggle('is-hit', (seq && read && k === rowIdx) || (!seq && n >= 3 && k === rowIdx));
    });
    rootEl.classList.toggle('is-on', !seq && n >= 1);
    leafEls.forEach((el, k) => el.classList.toggle('is-on', !seq && n >= 2 && k === leafIdx));
    leafEls.forEach((el) => el.querySelectorAll('span[data-v]').forEach((s) => s.classList.toggle('is-hit', !seq && n >= 2 && s.dataset.v === target)));
    seqStat.textContent = seq ? String(n) : '0';
    idxStat.textContent = seq ? '0' : String(n);
    seqStat.parentElement.classList.toggle('is-active', seq && n > 0);
    idxStat.parentElement.classList.toggle('is-active', !seq && n > 0);
  }
  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { host.replaceChildren(); } };
}
