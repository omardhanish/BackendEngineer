// "Topology" engine: boxes and links with packets that travel between them.
// Load balancers, replication, sharding, queues, pub/sub, microservices, proxies, deployments, Docker networks, ECS —
// plus a hash-ring layout for consistent hashing, where the ENGINE computes which server owns each key.
//
// scenario (tiers) = {
//   tiers: [[nodeId…], …],                     // columns left→right (rows top→bottom when the figure is narrow)
//   nodes: { id: {label, sub?, kind?} },       // kind: client user server db lb queue cache gateway service proxy cloud box topic
//   links: [[from, to, {label?, dashed?, both?}?], …],
//   groups?: [{label, nodes: [id…]}],
//   steps: [{caption, send?: [{from, to, label?, tone?: 'req'|'ok'|'err'|'info'|'warn'}],
//            state?: {id: 'up'|'down'|'busy'|'hot'|'stale'|'new'|'old'|'ok'},      // cumulative; null clears
//            badge?: {id: text}, items?: {id: [text…]}, label?: {id: text},       // cumulative; null clears
//            focus?: [id…]}]                                                       // this step only
// }
// scenario (ring) = {
//   layout: 'ring', size?: 100, rule?: 'ring'|'mod',
//   servers: {id: {at: number | number[]}},    // positions on the ring (several = virtual nodes)
//   keys: [{id, at}],                          // keys hash to a position 0 … size-1
//   steps: [{caption, servers: [id…], rule?, focus?: [keyId…]}]
// }
// go(i) is a pure function of i: cumulative state is folded once from step 0 up to i.
import { h, s } from '../../ui.js';

const uid = () => `t${Math.random().toString(36).slice(2, 8)}`;
const GLYPH = {
  client: ['M3 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M7 17h6M10 14v3'],
  user: ['M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4 17a6 6 0 0 1 12 0'],
  server: ['M3 3h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M3 11h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z', 'M5.5 6h.01M5.5 14h.01'],
  db: ['M3 5c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M3 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5', 'M3 10c0 1.7 3.1 3 7 3s7-1.3 7-3'],
  lb: ['M3 10h4', 'M7 10l7-5M7 10h7M7 10l7 5', 'M16 5h.01M16 10h.01M16 15h.01'],
  queue: ['M3 5h3v10H3zM8.5 5h3v10h-3zM14 5h3v10h-3z'],
  cache: ['M11 2 5 11h5l-1 7 6-9h-5z'],
  gateway: ['M4 17V9a6 6 0 0 1 12 0v8', 'M2 17h16M10 17v-5'],
  service: ['M10 2l7 4v8l-7 4-7-4V6z'],
  proxy: ['M10 2l6 2.5V10c0 4-3 6.5-6 8-3-1.5-6-4-6-8V4.5z'],
  cloud: ['M6 16a4 4 0 0 1-.5-8 5 5 0 0 1 9.4 1.2A3.4 3.4 0 0 1 14 16z'],
  box: ['M3 6l7-3 7 3v8l-7 3-7-3z', 'M3 6l7 3 7-3M10 9v8'],
  topic: ['M10 10h.01', 'M6.5 6.5a5 5 0 0 0 0 7M13.5 6.5a5 5 0 0 1 0 7', 'M3.5 3.5a9 9 0 0 0 0 13M16.5 3.5a9 9 0 0 1 0 13'],
};
const wrapText = (text, max) => {
  const out = [];
  let cur = '';
  for (const w of String(text).split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out.slice(0, 2);
};
const ease = (t) => 1 - (1 - t) ** 3;

// ------------------------------------------------------------------ ring layout
/** Pure ownership rule, exported for tests: which server owns each key in this step? */
export function ringState(sc, st) {
  const active = (st.servers || []).filter((id) => sc.servers[id]);
  const rule = st.rule || sc.rule || 'ring';
  const points = active.flatMap((id) => [].concat(sc.servers[id].at).map((a) => ({ id, at: a }))).sort((a, b) => a.at - b.at);
  const owner = (k) => {
    if (!active.length) return null;
    if (rule === 'mod') return active[k.at % active.length];
    return (points.find((p) => p.at >= k.at) || points[0]).id;
  };
  return { active, rule, points, owners: new Map(sc.keys.map((k) => [k.id, owner(k)])) };
}

function mountRing(host, sc, reduced) {
  const steps = sc.steps;
  const SIZE = sc.size || 100;
  const names = Object.keys(sc.servers);
  const tone = (id) => 'abcde'[names.indexOf(id) % 5];
  const atList = (id) => [].concat(sc.servers[id].at);
  const W = 300; const C = 150; const R = 108;
  const ang = (v) => (v / SIZE) * Math.PI * 2 - Math.PI / 2;
  const at = (v, r) => [C + r * Math.cos(ang(v)), C + r * Math.sin(ang(v))];

  const state = (i) => ringState(sc, steps[i]);

  const svg = s('svg', { class: 'hr', viewBox: `0 0 ${W} ${W}`, role: 'img', 'aria-label': 'Hash ring' });
  const track = s('circle', { cx: C, cy: C, r: R, class: 'hr-track' });
  const segLayer = s('g'); const arcLayer = s('g'); const keyLayer = s('g'); const srvLayer = s('g');
  svg.append(track, segLayer, arcLayer, keyLayer, srvLayer, s('text', { x: C, y: C - 4, class: 'hr-mid', 'text-anchor': 'middle' }, 'hash ring'), s('text', { x: C, y: C + 12, class: 'hr-mid-sub', 'text-anchor': 'middle' }, `0 … ${SIZE - 1}`));
  const side = h('div', { class: 'hr-side' });
  host.append(h('div', { class: 'hr-wrap' }, h('div', { class: 'hr-fig' }, svg), side));

  const arcPath = (a0, a1) => {
    const [x0, y0] = at(a0, R); const [x1, y1] = at(a1, R);
    const sweep = (((a1 - a0) % SIZE) + SIZE) % SIZE;
    return `M${x0} ${y0} A${R} ${R} 0 ${sweep > SIZE / 2 ? 1 : 0} 1 ${x1} ${y1}`;
  };

  function go(i) {
    const cur = state(i);
    const prev = i > 0 ? state(i - 1) : null;
    const focus = new Set(steps[i].focus || []);
    segLayer.replaceChildren(); arcLayer.replaceChildren(); keyLayer.replaceChildren(); srvLayer.replaceChildren();

    if (cur.rule === 'ring' && cur.points.length) {
      if (cur.points.length === 1) segLayer.append(s('circle', { cx: C, cy: C, r: R, class: `hr-seg tone-${tone(cur.points[0].id)}` }));
      else cur.points.forEach((p, k) => { const q = cur.points[(k + cur.points.length - 1) % cur.points.length]; segLayer.append(s('path', { d: arcPath(q.at, p.at), class: `hr-seg tone-${tone(p.id)}` })); });
    }
    // ghosts of servers that are not on the ring in this step (the modulo rule ignores ring positions entirely)
    if (cur.rule === 'ring') for (const id of names) if (!cur.active.includes(id)) for (const a of atList(id)) { const [x, y] = at(a, R); srvLayer.append(s('g', { class: 'hr-srv is-off' }, s('circle', { cx: x, cy: y, r: 11 }), s('text', { x, y: y + 4, 'text-anchor': 'middle' }, id))); }
    if (cur.rule === 'ring') for (const p of cur.points) { const [x, y] = at(p.at, R); srvLayer.append(s('g', { class: `hr-srv tone-${tone(p.id)}` }, s('circle', { cx: x, cy: y, r: 11 }), s('text', { x, y: y + 4, 'text-anchor': 'middle' }, p.id))); }

    let moved = 0;
    const counts = new Map(cur.active.map((id) => [id, 0]));
    for (const k of sc.keys) {
      const o = cur.owners.get(k.id);
      if (o) counts.set(o, (counts.get(o) || 0) + 1);
      const did = prev && prev.owners.get(k.id) !== o;
      if (did) moved++;
      const [x, y] = at(k.at, R - 22);
      keyLayer.append(s('g', { class: `hr-key${did ? ' is-moved' : ''}${focus.has(k.id) ? ' is-focus' : ''}${o ? ` tone-${tone(o)}` : ''}` },
        s('circle', { cx: x, cy: y, r: did || focus.has(k.id) ? 6.5 : 4.5 }),
        sc.keys.length <= 14 ? s('text', { x: at(k.at, R - 37)[0], y: at(k.at, R - 37)[1] + 3, 'text-anchor': 'middle' }, k.id) : null));
      if (focus.has(k.id) && o && cur.rule === 'ring') {
        const target = cur.points.find((p) => p.id === o && p.at >= k.at) || cur.points.find((p) => p.id === o);
        if (target) arcLayer.append(s('path', { d: arcPath(k.at, target.at), class: `hr-walk tone-${tone(o)}` }));
      }
    }
    const total = sc.keys.length;
    side.replaceChildren(
      h('div', { class: 'hr-rule' }, h('span', { class: 'eng-label' }, 'Rule'), cur.rule === 'mod' ? h('code', null, `hash % ${cur.active.length || 0}`) : h('span', null, 'first server clockwise')),
      h('ul', { class: 'hr-load', 'aria-label': 'Keys per server' }, cur.active.map((id) => h('li', { class: `tone-${tone(id)}` }, h('b', null, id), h('span', { class: 'bar' }, h('i', { style: { width: `${total ? (100 * counts.get(id)) / total : 0}%` } })), h('em', null, String(counts.get(id)))))),
      prev ? h('p', { class: `hr-moved${moved ? ' has-moved' : ''}` }, h('b', null, `${moved} of ${total}`), ' keys moved') : h('p', { class: 'hr-moved' }, `${total} keys placed`));
  }
  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { host.replaceChildren(); } };
}

// ------------------------------------------------------------------ tiers layout
export function mount(host, { props: sc, reduced }) {
  if (sc.layout === 'ring') return mountRing(host, sc, reduced);
  const steps = sc.steps;
  const ids = Object.keys(sc.nodes);
  const hasItems = new Set(steps.flatMap((st) => Object.keys(st.items || {})));
  const links = (sc.links || []).map(([from, to, o]) => ({ from, to, ...(o || {}) }));
  const mid = uid();

  // fold cumulative maps once
  const cum = [];
  const acc = { state: {}, badge: {}, items: {}, label: {} };
  for (const st of steps) {
    for (const k of ['state', 'badge', 'items', 'label']) for (const [id, v] of Object.entries(st[k] || {})) { if (v == null) delete acc[k][id]; else acc[k][id] = v; }
    cum.push(JSON.parse(JSON.stringify(acc)));
  }

  const NW = 128; const NH = 50; const EXTRA = 26;
  const nodeH = (id) => NH + (hasItems.has(id) ? EXTRA : 0);

  function layoutFor(orient) {
    const pos = new Map();
    const PAD = 18;
    let W; let H;
    if (orient === 'LR') {
      const GX = 64; const GY = 24;
      const tierH = sc.tiers.map((t) => t.reduce((n, id) => n + nodeH(id), 0) + GY * (t.length - 1));
      H = Math.max(...tierH) + PAD * 2 + 10;
      W = sc.tiers.length * NW + (sc.tiers.length - 1) * GX + PAD * 2;
      sc.tiers.forEach((t, ti) => { let y = PAD + (H - 10 - PAD * 2 - tierH[ti]) / 2; for (const id of t) { pos.set(id, { x: PAD + ti * (NW + GX), y, w: NW, h: nodeH(id), col: ti, row: t.indexOf(id) }); y += nodeH(id) + GY; } });
    } else {
      const GX = 26; const GY = 46;
      const rowW = sc.tiers.map((t) => t.length * NW + GX * (t.length - 1));
      const rowH = sc.tiers.map((t) => Math.max(...t.map(nodeH)));
      W = Math.max(...rowW) + PAD * 2;
      H = rowH.reduce((a, b) => a + b, 0) + GY * (sc.tiers.length - 1) + PAD * 2 + 10;
      let y = PAD;
      sc.tiers.forEach((t, ti) => { let x = (W - rowW[ti]) / 2; for (const id of t) { pos.set(id, { x, y: y + (rowH[ti] - nodeH(id)) / 2, w: NW, h: nodeH(id), col: ti, row: t.indexOf(id) }); x += NW + GX; } y += rowH[ti] + GY; });
    }
    return { pos, W, H };
  }

  function anchor(a, b, orient) {
    let p0; let p1; let c0; let c1;
    if (orient === 'LR' && a.col !== b.col) {
      const fwd = a.col < b.col;
      p0 = { x: fwd ? a.x + a.w : a.x, y: a.y + a.h / 2 }; p1 = { x: fwd ? b.x : b.x + b.w, y: b.y + b.h / 2 };
      const d = Math.max(28, Math.abs(p1.x - p0.x) / 2) * (fwd ? 1 : -1);
      const bow = Math.abs(a.col - b.col) > 1 ? (a.row + b.row) % 2 === 0 ? -46 : 46 : 0;
      c0 = { x: p0.x + d, y: p0.y + bow }; c1 = { x: p1.x - d, y: p1.y + bow };
    } else if (orient === 'TB' && a.col !== b.col) {
      const fwd = a.col < b.col;
      p0 = { x: a.x + a.w / 2, y: fwd ? a.y + a.h : a.y }; p1 = { x: b.x + b.w / 2, y: fwd ? b.y : b.y + b.h };
      const d = Math.max(20, Math.abs(p1.y - p0.y) / 2) * (fwd ? 1 : -1);
      const bow = Math.abs(a.col - b.col) > 1 ? (a.row + b.row) % 2 === 0 ? -60 : 60 : 0;
      c0 = { x: p0.x + bow, y: p0.y + d }; c1 = { x: p1.x + bow, y: p1.y - d };
    } else if (orient === 'LR') { // same column: vertical hop
      const down = a.y < b.y;
      p0 = { x: a.x + a.w / 2, y: down ? a.y + a.h : a.y }; p1 = { x: b.x + b.w / 2, y: down ? b.y : b.y + b.h };
      c0 = { ...p0 }; c1 = { ...p1 };
    } else { // same row: horizontal hop
      const right = a.x < b.x;
      p0 = { x: right ? a.x + a.w : a.x, y: a.y + a.h / 2 }; p1 = { x: right ? b.x : b.x + b.w, y: b.y + b.h / 2 };
      c0 = { ...p0 }; c1 = { ...p1 };
    }
    return { p0, p1, d: `M${p0.x} ${p0.y} C${c0.x} ${c0.y}, ${c1.x} ${c1.y}, ${p1.x} ${p1.y}` };
  }

  const stage = h('div', { class: 'flow-wrap topo-wrap' });
  host.append(stage);
  let orient = null;
  let view = null; // {svg, nodes: Map, linkEls, packetLayer}
  let current = 0;
  let raf = 0;

  function pickOrient() {
    const availW = Math.max(240, host.clientWidth || 640);
    const score = (o) => { const { W, H } = layoutFor(o); return Math.min(availW / W, 330 / H, 1.15); };
    return sc.dir === 'TB' ? 'TB' : sc.dir === 'LR' ? 'LR' : score('LR') >= score('TB') * 0.9 ? 'LR' : 'TB';
  }

  function build() {
    orient = pickOrient();
    const { pos, W, H } = layoutFor(orient);
    const svg = s('svg', { class: 'topo', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sc.title || 'Topology diagram' },
      s('defs', null, s('marker', { id: mid, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'fl-arrow' }))));
    // groups
    for (const g of sc.groups || []) {
      const rs = g.nodes.map((id) => pos.get(id)).filter(Boolean);
      if (!rs.length) continue;
      const x0 = Math.min(...rs.map((r) => r.x)) - 12; const y0 = Math.min(...rs.map((r) => r.y)) - 26;
      const x1 = Math.max(...rs.map((r) => r.x + r.w)) + 12; const y1 = Math.max(...rs.map((r) => r.y + r.h)) + 16;
      svg.append(s('g', { class: 'tp-group' }, s('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 16 }), s('text', { x: x0 + 12, y: y0 + 16 }, g.label)));
    }
    const linkEls = links.map((l) => {
      const a = pos.get(l.from); const b = pos.get(l.to);
      const geo = anchor(a, b, orient);
      const path = s('path', { d: geo.d, 'marker-end': l.arrow === false ? null : `url(#${mid})`, 'marker-start': l.both ? `url(#${mid})` : null });
      const lx = (geo.p0.x + geo.p1.x) / 2; const ly = (geo.p0.y + geo.p1.y) / 2;
      const g = s('g', { class: `tp-link${l.dashed ? ' is-dashed' : ''}` }, path, l.label ? s('text', { x: lx, y: ly - 6, 'text-anchor': 'middle', class: 'fl-elabel' }, l.label) : null);
      svg.append(g);
      return { ...l, el: g, path };
    });
    const nodes = new Map();
    for (const id of ids) {
      const n = sc.nodes[id]; const p = pos.get(id);
      const lab = s('text', { x: 40, y: 0, class: 'tp-label' });
      const sub = s('text', { x: 40, y: 0, class: 'tp-sub' });
      const badge = s('g', { class: 'tp-badge' });
      const items = s('g', { class: 'tp-items' });
      const glyph = GLYPH[n.kind];
      const g = s('g', { class: 'tp-node', transform: `translate(${p.x} ${p.y})`, 'data-state': 'up' },
        s('rect', { width: p.w, height: p.h, rx: 12 }),
        glyph ? s('g', { class: 'tp-ico', transform: 'translate(12 8) scale(1.05)' }, glyph.map((d) => s('path', { d }))) : null,
        lab, sub, items, badge);
      svg.append(g);
      nodes.set(id, { id, g, lab, sub, badge, items, p, n });
    }
    const packetLayer = s('g', { class: 'tp-packets' });
    svg.append(packetLayer);
    stage.replaceChildren(svg);
    view = { svg, nodes, linkEls, packetLayer, pos };
  }

  function setLabel(nd, text) {
    const x = nd.n.kind && GLYPH[nd.n.kind] ? 40 : 12;
    const lines = wrapText(text, nd.n.kind && GLYPH[nd.n.kind] ? 13 : 17);
    const hasSub = !!nd.n.sub && lines.length === 1;
    const top = (NH - (lines.length - 1) * 14 - (hasSub ? 12 : 0)) / 2 + 5;
    nd.lab.replaceChildren(...lines.map((ln, k) => s('tspan', { x, dy: k ? 14 : 0 }, ln)));
    nd.lab.setAttribute('x', x); nd.lab.setAttribute('y', top + 4);
    nd.sub.textContent = hasSub ? nd.n.sub : '';
    nd.sub.setAttribute('x', x); nd.sub.setAttribute('y', top + 4 + 15);
  }

  function packetFor(send) {
    const a = view.pos.get(send.from); const b = view.pos.get(send.to);
    if (!a || !b) return null;
    let l = view.linkEls.find((k) => k.from === send.from && k.to === send.to);
    let reverse = false;
    if (!l) { l = view.linkEls.find((k) => k.from === send.to && k.to === send.from); reverse = !!l; }
    let path = l?.path;
    let temp = null;
    if (!path) { temp = s('path', { d: anchor(a, b, orient).d, class: 'tp-temp' }); view.svg.insertBefore(temp, view.packetLayer); path = temp; }
    let len = 0;
    try { len = path.getTotalLength(); } catch { /* detached before first layout; go() runs again once attached */ }
    const label = send.label || '';
    const w = label ? Math.max(24, label.length * 6.6 + 14) : 12;
    const g = s('g', { class: `tp-pk tone-${send.tone || 'req'}` }, s('rect', { x: -w / 2, y: -9, width: w, height: 18, rx: 9 }), label ? s('text', { x: 0, y: 3.5, 'text-anchor': 'middle' }, label) : null);
    view.packetLayer.append(g);
    const pad = Math.min(len / 2 - 2, w / 2 + 8); // keep the pill off the node borders
    const put = (t) => {
      try {
        const d = pad + (len - 2 * pad) * (reverse ? 1 - t : t);
        const pt = path.getPointAtLength(Math.max(0, d));
        g.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      } catch { /* not laid out yet */ }
    };
    put(0);
    return { g, put, temp, link: l };
  }

  function go(i) {
    current = i;
    cancelAnimationFrame(raf);
    if (!view) build();
    const st = steps[i]; const c = cum[i];
    const focus = new Set(st.focus || []);
    for (const t of st.send || []) { focus.add(t.from); focus.add(t.to); }
    view.packetLayer.replaceChildren();
    view.svg.querySelectorAll('.tp-temp').forEach((el) => el.remove());
    for (const nd of view.nodes.values()) {
      nd.g.dataset.state = c.state[nd.id] || 'up';
      nd.g.classList.toggle('is-focus', focus.has(nd.id));
      setLabel(nd, c.label[nd.id] || nd.n.label);
      const b = c.badge[nd.id];
      nd.badge.replaceChildren();
      if (b) { const w = Math.max(28, String(b).length * 6.4 + 14); nd.badge.append(s('rect', { x: nd.p.w / 2 - w / 2, y: nd.p.h - 9, width: w, height: 18, rx: 9 }), s('text', { x: nd.p.w / 2, y: nd.p.h + 3.5, 'text-anchor': 'middle' }, String(b))); }
      nd.items.replaceChildren();
      const list = c.items[nd.id];
      if (list) {
        let x = 10; const y = NH - 4; let shown = 0;
        for (const it of list) {
          const w = Math.min(54, Math.max(24, String(it).length * 6.2 + 10));
          if (x + w > nd.p.w - 10) break;
          nd.items.append(s('rect', { x, y, width: w, height: 18, rx: 6 }), s('text', { x: x + w / 2, y: y + 12.5, 'text-anchor': 'middle' }, String(it)));
          x += w + 4; shown++;
        }
        if (shown < list.length) nd.items.append(s('text', { x: nd.p.w - 12, y: y + 12.5, 'text-anchor': 'end', class: 'tp-more' }, `+${list.length - shown}`));
      }
    }
    const sends = st.send || [];
    for (const l of view.linkEls) l.el.classList.toggle('is-on', sends.some((t) => (t.from === l.from && t.to === l.to) || (t.from === l.to && t.to === l.from)));
    const pks = sends.map((t) => packetFor(t)).filter(Boolean);
    if (reduced || !pks.length) { pks.forEach((p) => p.put(1)); return; }
    const start = performance.now();
    const DUR = 640; const STAGGER = 160;
    const tick = (now) => {
      let live = false;
      pks.forEach((p, k) => {
        const t = Math.min(1, Math.max(0, (now - start - k * STAGGER) / DUR));
        p.put(ease(t));
        if (t < 1) live = true;
      });
      if (live) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // The figure is built before it is attached, so the first real width arrives here: draw again with true
  // measurements. Later, a different width may favour the other orientation; rebuild and replay the step.
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = host.clientWidth;
    if (!w) return;
    if (!lastW || (Math.abs(w - lastW) >= 24 && pickOrient() !== orient)) { lastW = w; view = null; go(current); return; }
    if (Math.abs(w - lastW) >= 24) lastW = w;
  });
  ro.observe(host);

  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { cancelAnimationFrame(raf); ro.disconnect(); host.replaceChildren(); } };
}
