// Structural checks for the animation engines that have their own scenario formats (topology, scrubber).
// Shared by tools/validate.mjs and the tests. Each function pushes human-readable messages onto `errs`.
import { simulate } from '../../public/js/anim/engines/scrubber-git.js';

const words = (s) => String(s ?? '').replace(/`/g, '').trim().split(/\s+/).filter(Boolean).length;
const cap = (errs, label, text, max) => { const n = words(text); if (n > max) errs.push(`${label} has ${n} words (max ${max})`); };

export const TP_KINDS = new Set(['client', 'user', 'server', 'db', 'lb', 'queue', 'cache', 'gateway', 'service', 'proxy', 'cloud', 'box', 'topic']);
export const TP_STATES = new Set(['up', 'down', 'busy', 'hot', 'stale', 'new', 'old', 'ok']);
const JWT_VIEWS = new Set(['parts', 'decode', 'sign', 'tamper', 'resign']);

export function checkTopology(sc, errs) {
  const steps = sc.steps || [];
  if (sc.layout === 'ring') {
    const servers = sc.servers || {};
    const names = Object.keys(servers);
    const size = sc.size || 100;
    const inRange = (a) => Number.isInteger(a) && a >= 0 && a < size;
    if (!names.length || names.length > 5) errs.push('topology ring: 1 to 5 servers');
    for (const [id, v] of Object.entries(servers)) for (const a of [].concat(v?.at)) if (!inRange(a)) errs.push(`topology ring: server "${id}" position ${a} is not an integer in 0…${size - 1}`);
    const keys = sc.keys || [];
    if (!keys.length || keys.length > 16) errs.push('topology ring: 1 to 16 keys');
    for (const k of keys) if (!inRange(k.at)) errs.push(`topology ring: key "${k.id}" position is not an integer in 0…${size - 1}`);
    if (new Set(keys.map((k) => k.id)).size !== keys.length) errs.push('topology ring: key ids must be unique');
    if (sc.rule && !['ring', 'mod'].includes(sc.rule)) errs.push('topology ring: rule must be "ring" or "mod"');
    steps.forEach((s, i) => {
      if (!Array.isArray(s.servers)) errs.push(`topology ring step ${i + 1}: needs a servers list`);
      for (const id of s.servers || []) if (!servers[id]) errs.push(`topology ring step ${i + 1}: unknown server "${id}"`);
      for (const k of s.focus || []) if (!keys.some((x) => x.id === k)) errs.push(`topology ring step ${i + 1}: unknown key "${k}"`);
      if (s.rule && !['ring', 'mod'].includes(s.rule)) errs.push(`topology ring step ${i + 1}: rule must be "ring" or "mod"`);
    });
    return;
  }
  const nodes = sc.nodes || {};
  const ids = Object.keys(nodes);
  const tiers = sc.tiers || [];
  const placed = tiers.flat();
  if (ids.length < 2 || ids.length > 8) errs.push('topology: 2 to 8 nodes');
  if (tiers.length < 2 || tiers.length > 4) errs.push('topology: 2 to 4 tiers (columns)');
  if (tiers.some((t) => !Array.isArray(t) || t.length < 1 || t.length > 4)) errs.push('topology: each tier holds 1 to 4 nodes');
  for (const id of placed) if (!nodes[id]) errs.push(`topology: a tier lists unknown node "${id}"`);
  for (const id of ids) if (!placed.includes(id)) errs.push(`topology: node "${id}" is not placed in any tier`);
  if (new Set(placed).size !== placed.length) errs.push('topology: a node appears in more than one tier');
  for (const [id, n] of Object.entries(nodes)) {
    cap(errs, `topology node "${id}" label`, n.label, 5);
    if (n.sub) cap(errs, `topology node "${id}" sub`, n.sub, 5);
    if (n.kind && !TP_KINDS.has(n.kind)) errs.push(`topology node "${id}": unknown kind "${n.kind}" (use ${[...TP_KINDS].join(', ')})`);
  }
  for (const l of sc.links || []) {
    if (!Array.isArray(l) || !nodes[l[0]] || !nodes[l[1]]) errs.push(`topology: link ${JSON.stringify(l?.slice?.(0, 2))} references an unknown node`);
    else if (l[2]?.label) cap(errs, 'topology link label', l[2].label, 3);
  }
  for (const g of sc.groups || []) { cap(errs, 'topology group label', g.label, 4); for (const id of g.nodes || []) if (!nodes[id]) errs.push(`topology: group "${g.label}" lists unknown node "${id}"`); }
  steps.forEach((s, i) => {
    const at = `topology step ${i + 1}`;
    for (const t of s.send || []) {
      if (!nodes[t.from] || !nodes[t.to]) errs.push(`${at}: send ${t.from}→${t.to} references an unknown node`);
      if (t.label) cap(errs, `${at} packet label`, t.label, 3);
      if (t.tone && !['req', 'ok', 'err', 'info', 'warn'].includes(t.tone)) errs.push(`${at}: packet tone "${t.tone}" must be req, ok, err, info or warn`);
    }
    for (const [id, v] of Object.entries(s.state || {})) { if (!nodes[id]) errs.push(`${at}: state for unknown node "${id}"`); else if (v !== null && !TP_STATES.has(v)) errs.push(`${at}: unknown state "${v}" (use ${[...TP_STATES].join(', ')})`); }
    for (const [id, v] of Object.entries(s.badge || {})) { if (!nodes[id]) errs.push(`${at}: badge for unknown node "${id}"`); else if (v != null && String(v).length > 12) errs.push(`${at}: badge "${v}" is longer than 12 characters`); }
    for (const [id, list] of Object.entries(s.items || {})) { if (!nodes[id]) errs.push(`${at}: items for unknown node "${id}"`); else if (list != null && (!Array.isArray(list) || list.length > 6 || list.some((x) => String(x).length > 8))) errs.push(`${at}: items must be at most 6 entries of at most 8 characters`); }
    for (const [id, v] of Object.entries(s.label || {})) { if (!nodes[id]) errs.push(`${at}: label for unknown node "${id}"`); else if (v != null) cap(errs, `${at} label`, v, 5); }
    for (const id of s.focus || []) if (!nodes[id]) errs.push(`${at}: focus on unknown node "${id}"`);
  });
}

export function checkScrubber(sc, errs) {
  const steps = sc.steps || [];
  switch (sc.kind) {
    case 'layers': {
      const L = sc.layers || [];
      if (L.length < 3 || L.length > 10) errs.push('scrubber layers: 3 to 10 layers');
      L.forEach((l, j) => {
        if (typeof l.cmd !== 'string' || !l.cmd.trim()) errs.push(`scrubber layers: layer ${j + 1} needs a cmd`);
        else if (l.cmd.length > 60) errs.push(`scrubber layers: layer ${j + 1} cmd is longer than 60 characters`);
        if (l.cost != null && !(typeof l.cost === 'number' && l.cost >= 0)) errs.push(`scrubber layers: layer ${j + 1} cost must be a number of seconds`);
        if (l.watch != null && (!Array.isArray(l.watch) || l.watch.some((w) => typeof w !== 'string'))) errs.push(`scrubber layers: layer ${j + 1} watch must be a list of file names`);
      });
      steps.forEach((s, i) => {
        if (!Array.isArray(s.edited)) errs.push(`scrubber layers step ${i + 1}: needs an "edited" list (use [] for no change)`);
        for (const e of s.edited || []) {
          const m = /^line:(\d+)$/.exec(e);
          if (typeof e !== 'string') errs.push(`scrubber layers step ${i + 1}: edited entries are strings`);
          else if (m && (Number(m[1]) < 1 || Number(m[1]) > L.length)) errs.push(`scrubber layers step ${i + 1}: ${e} points past the last layer`);
        }
      });
      break;
    }
    case 'scan': {
      const rows = sc.rows || [];
      if (rows.length < 8 || rows.length > 16) errs.push('scrubber scan: 8 to 16 rows');
      if (new Set(rows).size !== rows.length) errs.push('scrubber scan: rows must be unique');
      if (rows.some((r) => typeof r !== 'string' || r.length > 10)) errs.push('scrubber scan: rows are strings of at most 10 characters');
      if (!rows.includes(sc.target)) errs.push('scrubber scan: target must be one of the rows');
      steps.forEach((s, i) => {
        if (!['seq', 'index'].includes(s.mode)) errs.push(`scrubber scan step ${i + 1}: mode must be "seq" or "index"`);
        const max = s.mode === 'index' ? 3 : rows.length;
        if (!Number.isInteger(s.n) || s.n < 0 || s.n > max) errs.push(`scrubber scan step ${i + 1}: n must be an integer from 0 to ${max}`);
      });
      break;
    }
    case 'git': {
      let ops = [];
      steps.forEach((s, i) => { if (!Array.isArray(s.do) || !s.do.length) errs.push(`scrubber git step ${i + 1}: needs a "do" list`); ops = ops.concat(s.do || []); });
      for (const op of ops) { const m = /^commit\s+(\S+)$/.exec(op); if (/^commit\b/.test(op) && !(m && /^[A-Za-z0-9]{1,3}$/.test(m[1]))) errs.push(`scrubber git: "${op}": commit ids are 1 to 3 letters or digits`); }
      try {
        steps.reduce((acc, s) => { const next = acc.concat(s.do || []); simulate(next); return next; }, []);
        const m = simulate(ops);
        if (m.commits.length > 12) errs.push(`scrubber git: ${m.commits.length} commits (max 12)`);
        if (new Set(m.commits.map((c) => c.lane)).size > 4) errs.push('scrubber git: more than 4 branches in the picture');
      } catch (e) { errs.push(`scrubber git: ${e.message}`); }
      break;
    }
    case 'jwt': {
      if (typeof sc.secret !== 'string' || !sc.secret) errs.push('scrubber jwt: needs a demo secret');
      if (!sc.payload || typeof sc.payload !== 'object' || Array.isArray(sc.payload) || Object.keys(sc.payload).length > 6) errs.push('scrubber jwt: payload must be an object with at most 6 claims');
      steps.forEach((s, i) => {
        if (s.view && !JWT_VIEWS.has(s.view)) errs.push(`scrubber jwt step ${i + 1}: view must be one of ${[...JWT_VIEWS].join(', ')}`);
        if (['tamper', 'resign'].includes(s.view) && !(s.tamper && Object.keys(s.tamper).length === 1)) errs.push(`scrubber jwt step ${i + 1}: "${s.view}" needs tamper with exactly one claim`);
      });
      break;
    }
    default: errs.push(`scrubber: kind must be layers, scan, git or jwt (found "${sc.kind}")`);
  }
}
