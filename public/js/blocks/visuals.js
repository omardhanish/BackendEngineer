// Declarative visuals: flow, seq, timeline (steppable) and compare, table, anatomy (static / part-stepped).
// Authors write data; this file owns every pixel. Each builder returns a figure {el, stepper, transcript, destroy}.
import { h, s, icon, rich } from '../ui.js';
import { createFigure } from '../player.js';

const wrap = (text, max = 20) => {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
};
const uid = () => `v${Math.random().toString(36).slice(2, 8)}`;
const svgText = (lines, x, y, lh, cls) => s('text', { x, y, class: cls, 'text-anchor': 'middle' }, lines.map((l, i) => s('tspan', { x, dy: i ? lh : 0 }, l)));

// ------------------------------------------------------------------ flow
export function flowBlock(spec) {
  const nodes = spec.nodes;
  const edges = spec.edges?.length ? spec.edges : nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const layer = new Map(nodes.map((n) => [n.id, 0]));
  for (let p = 0; p < nodes.length; p++) for (const e of edges) if (!e.back && layer.get(e.to) < layer.get(e.from) + 1) layer.set(e.to, layer.get(e.from) + 1);
  const L = Math.max(...layer.values()) + 1;
  const groups = Array.from({ length: L }, () => []);
  nodes.forEach((n) => groups[layer.get(n.id)].push(n));
  const vertical = spec.dir === 'TB' || (spec.dir !== 'LR' && L > 4);
  const NW = 138; const NH = 54; const GX = 46; const GY = 38; const PAD = 16;
  const maxPer = Math.max(...groups.map((g) => g.length));
  const hasBack = edges.some((e) => e.back);
  const W = vertical ? maxPer * NW + (maxPer - 1) * GX + PAD * 2 : L * NW + (L - 1) * GX + PAD * 2;
  const H = (vertical ? L * NH + (L - 1) * GY + PAD * 2 : maxPer * NH + (maxPer - 1) * GY + PAD * 2) + (hasBack ? 34 : 0);
  const pos = new Map();
  groups.forEach((g, li) => g.forEach((n, k) => {
    if (vertical) pos.set(n.id, { x: (W - (g.length * NW + (g.length - 1) * GX)) / 2 + k * (NW + GX), y: PAD + li * (NH + GY) });
    else pos.set(n.id, { x: PAD + li * (NW + GX), y: (H - (hasBack ? 34 : 0) - (g.length * NH + (g.length - 1) * GY)) / 2 + k * (NH + GY) });
  }));

  const id = uid();
  const svg = s('svg', { class: 'flow', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.title || 'Flow diagram' },
    s('defs', null,
      s('marker', { id, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto' }, s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'fl-arrow' })),
      s('marker', { id: `${id}on`, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto' }, s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'fl-arrow on' }))));

  const edgeEls = edges.map((e) => {
    const a = pos.get(e.from); const b = pos.get(e.to);
    let d; let lx; let ly;
    if (e.back) {
      const y0 = vertical ? a.y + NH : a.y + NH; const x0 = a.x + NW / 2; const x1 = b.x + NW / 2;
      const yb = Math.max(a.y, b.y) + NH + 30;
      d = `M${x0} ${y0} C${x0} ${yb}, ${x1} ${yb}, ${x1} ${b.y + NH + 2}`; lx = (x0 + x1) / 2; ly = yb - 6;
    } else if (vertical) {
      const x0 = a.x + NW / 2; const y0 = a.y + NH; const x1 = b.x + NW / 2; const y1 = b.y - 2; const m = (y1 - y0) / 2;
      d = `M${x0} ${y0} C${x0} ${y0 + m}, ${x1} ${y1 - m}, ${x1} ${y1}`; lx = (x0 + x1) / 2; ly = (y0 + y1) / 2;
    } else {
      const x0 = a.x + NW; const y0 = a.y + NH / 2; const x1 = b.x - 2; const y1 = b.y + NH / 2; const m = (x1 - x0) / 2;
      d = `M${x0} ${y0} C${x0 + m} ${y0}, ${x1 - m} ${y1}, ${x1} ${y1}`; lx = (x0 + x1) / 2; ly = (y0 + y1) / 2 - 7;
    }
    const g = s('g', { class: `fl-edge${e.dashed ? ' is-dashed' : ''}` }, s('path', { d, 'marker-end': `url(#${id})`, 'data-m': id }), e.label ? s('text', { x: lx, y: ly, class: 'fl-elabel', 'text-anchor': 'middle' }, e.label) : null);
    return g;
  });
  edgeEls.forEach((g) => svg.append(g));
  const nodeEls = new Map();
  for (const n of nodes) {
    const p = pos.get(n.id);
    const lines = wrap(n.label, 17);
    const sub = n.sub ? wrap(n.sub, 22).slice(0, 1) : [];
    const cy = p.y + NH / 2 - (lines.length - 1) * 8 - (sub.length ? 6 : 0);
    const g = s('g', { class: `fl-node tone-${n.tone || 'neutral'}`, transform: `translate(${p.x} ${p.y})` },
      s('rect', { width: NW, height: NH, rx: 12 }),
      svgText(lines, NW / 2, cy - p.y + 5, 16, 'fl-label'),
      sub.length ? svgText(sub, NW / 2, cy - p.y + 5 + lines.length * 16 + 2, 13, 'fl-sub') : null);
    nodeEls.set(n.id, g);
    svg.append(g);
  }

  const steps = spec.steps?.length ? spec.steps : edges.map((e) => ({ caption: e.caption || e.label || `${byId.get(e.from).label} → ${byId.get(e.to).label}`, active: [e.from, e.to], edges: [edges.indexOf(e)] }));
  const seen = (i, key, val) => steps.slice(0, i).some((st) => (st[key] || []).includes(val));
  function go(i) {
    const st = steps[i];
    for (const [nid, g] of nodeEls) { g.classList.toggle('is-on', (st.active || []).includes(nid)); g.classList.toggle('is-past', !(st.active || []).includes(nid) && seen(i, 'active', nid)); }
    edgeEls.forEach((g, k) => {
      const on = (st.edges || []).includes(k);
      g.classList.toggle('is-on', on); g.classList.toggle('is-past', !on && seen(i, 'edges', k));
      g.querySelector('path').setAttribute('marker-end', `url(#${on ? id + 'on' : id})`);
    });
  }
  return createFigure({ label: spec.title || 'How it flows', tag: 'Flow', count: steps.length, render: go, caption: (i) => steps[i].caption, body: h('div', { class: 'flow-wrap' }, svg), className: 'fig-flow' });
}

// ------------------------------------------------------------------ seq
export function seqBlock(spec) {
  const A = spec.actors; const M = spec.messages;
  const W = Math.max(560, A.length * 200); const top = 58; const rowH = 54; const H = top + M.length * rowH + 26;
  const colW = W / A.length;
  const xOf = (idv) => (A.findIndex((a) => a.id === idv) + 0.5) * colW;
  const id = uid();
  const svg = s('svg', { class: 'seq', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.title || 'Sequence diagram' },
    s('defs', null, s('marker', { id, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto' }, s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'fl-arrow on' }))));
  A.forEach((a) => {
    const x = xOf(a.id);
    svg.append(s('line', { x1: x, x2: x, y1: 46, y2: H - 8, class: 'sq-life' }),
      s('g', { class: 'sq-actor', transform: `translate(${x - 70} 8)` }, s('rect', { width: 140, height: 38, rx: 10 }), s('text', { x: 70, y: 24, 'text-anchor': 'middle' }, a.label)));
  });
  const msgEls = M.map((m, k) => {
    const y = top + 20 + k * rowH; const x0 = xOf(m.from); const x1 = xOf(m.to);
    let line;
    if (m.from === m.to) line = s('path', { d: `M${x0} ${y - 10} h44 v26 h-44`, 'marker-end': `url(#${id})`, class: 'sq-line' });
    else line = s('line', { x1: x0, x2: x1 + (x1 > x0 ? -2 : 2), y1: y, y2: y, class: 'sq-line', 'marker-end': `url(#${id})` });
    const lx = m.from === m.to ? x0 + 52 : (x0 + x1) / 2;
    const g = s('g', { class: `sq-msg${m.dashed ? ' is-dashed' : ''}` }, line, s('text', { x: lx, y: m.from === m.to ? y + 4 : y - 8, class: 'sq-label', 'text-anchor': m.from === m.to ? 'start' : 'middle' }, m.label));
    svg.append(g);
    return g;
  });
  function go(i) { msgEls.forEach((g, k) => { g.classList.toggle('is-on', k === i); g.classList.toggle('is-past', k < i); g.classList.toggle('is-future', k > i); }); }
  return createFigure({ label: spec.title || 'Who talks to whom', tag: 'Sequence', count: M.length, render: go, caption: (i) => M[i].note || M[i].label, body: h('div', { class: 'flow-wrap' }, svg), className: 'fig-seq' });
}

// ------------------------------------------------------------------ timeline
export function timelineBlock(spec) {
  const items = spec.items;
  const els = items.map((it, k) => h('li', { class: 'tl-item' }, h('span', { class: 'tl-dot', 'aria-hidden': 'true' }, String(k + 1)), h('div', { class: 'tl-copy' }, h('b', null, it.label), it.text ? h('span', null, rich(it.text)) : null)));
  const go = (i) => els.forEach((el, k) => { el.classList.toggle('is-on', k === i); el.classList.toggle('is-past', k < i); });
  return createFigure({ label: spec.title || 'In order', tag: 'Timeline', count: items.length, render: go, caption: (i) => items[i].text ? `${items[i].label}: ${items[i].text}` : items[i].label, body: h('ol', { class: 'tl' }, els), className: 'fig-timeline' });
}

// ------------------------------------------------------------------ compare
export function compareBlock(spec) {
  const side = (sd, tone) => h('div', { class: `cmp-side tone-${sd.tone || tone}` },
    h('h4', { class: 'cmp-title' }, sd.title),
    h('ul', null, sd.items.map((t) => h('li', null, icon(sd.tone === 'bad' || (!sd.tone && tone === 'bad') ? 'x' : sd.tone === 'good' || (!sd.tone && tone === 'good') ? 'check' : 'dot', 15), h('span', null, rich(t))))));
  const body = h('div', { class: 'cmp' }, side(spec.left, spec.leftTone || 'neutral'), side(spec.right, spec.rightTone || 'neutral'), spec.verdict ? h('p', { class: 'cmp-verdict' }, rich(spec.verdict)) : null);
  return createFigure({ label: spec.title || 'Side by side', tag: 'Compare', count: 1, render: () => {}, caption: () => spec.caption || '', body, className: 'fig-compare' });
}

// ------------------------------------------------------------------ table
export function tableBlock(spec) {
  const hl = spec.highlight || {};
  const body = h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, spec.head.map((c, ci) => h('th', { class: ci === hl.col ? 'is-hl' : '' }, c)))),
    h('tbody', null, spec.rows.map((r, ri) => h('tr', { class: ri === hl.row ? 'is-hl' : '' }, r.map((c, ci) => h(ci === 0 ? 'th' : 'td', { class: ci === hl.col ? 'is-hl' : '', scope: ci === 0 ? 'row' : null }, c)))))));
  return createFigure({ label: spec.title || 'At a glance', tag: 'Table', count: 1, render: () => {}, caption: () => spec.caption || '', body, className: 'fig-table' });
}

// ------------------------------------------------------------------ anatomy
export function anatomyBlock(spec) {
  const parts = spec.parts;
  let stepper;
  const segs = parts.map((p, k) => h('button', { class: `seg tone-${p.tone || 'abcde'[k % 5]}`, type: 'button', 'aria-label': `${p.label}: ${p.text}`, onclick: () => stepper.go(k), onmouseenter: () => stepper.go(k) },
    h('code', { class: 'seg-text' }, p.text), h('span', { class: 'seg-label' }, p.label)));
  const note = h('p', { class: 'anat-note' });
  const body = h('div', { class: 'anat' }, h('div', { class: 'anat-line' }, segs), note);
  const go = (i) => { segs.forEach((el, k) => el.classList.toggle('is-on', k === i)); note.replaceChildren(...rich(parts[i].note || '')); };
  const fig = createFigure({ label: spec.title || 'Anatomy', tag: 'Anatomy', count: parts.length, render: go, caption: (i) => `${parts[i].label}: ${parts[i].note || parts[i].text}`, body, className: 'fig-anatomy' });
  stepper = fig.stepper;
  return fig;
}
