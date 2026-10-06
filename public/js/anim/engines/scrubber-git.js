// scrubber · git — a commit graph driven by a tiny model of real git. Authors list operations; the engine
// replays them from the start for every step, so go(i) is pure and the picture can never disagree with git.
//
// scenario = { kind: 'git', steps: [{caption, do: ['commit A', 'branch feature', 'checkout feature', …]}] }
// operations:
//   commit <id>                 new commit on the current branch
//   branch <name>               create a branch at HEAD            checkout <name> | checkout -b <name> | switch -c <name>
//   merge [--no-ff] <name> [id] fast-forward when possible, else a merge commit (default id "M")
//   rebase <name>               replay this branch's commits on top of <name> (new ids get a prime: C → C')
//   reset <id>                  move the current branch to a commit   cherry-pick <id> [newId]   tag <name>
//   push [branch]               move origin/<branch> to the local tip
//   remote-commit <id>          a teammate pushes a commit to origin/main (visible after fetch)
//   fetch | pull                download remote commits | fetch, then merge origin/main
import { s, h } from '../../ui.js';

/** Pure model: returns {commits (in creation order), refs (name → id), head}. Exported for tests. */
export function simulate(ops) {
  const commits = new Map();
  const refs = new Map();
  const head = { ref: 'main', id: null };
  const pending = [];
  let order = 0;
  const tip = () => (head.ref ? refs.get(head.ref) ?? null : head.id);
  const setTip = (id) => { if (head.ref) refs.set(head.ref, id); else head.id = id; };
  const lane = () => head.ref || 'detached';
  const add = (id, parents, laneName) => { if (commits.has(id)) throw new Error(`commit id "${id}" is used twice`); commits.set(id, { id, parents, lane: laneName, order: order++ }); return id; };
  const ancestors = (id) => {
    const seen = new Set();
    const stack = [id];
    while (stack.length) { const c = stack.pop(); if (!c || seen.has(c)) continue; seen.add(c); for (const p of commits.get(c)?.parents || []) stack.push(p); }
    return seen;
  };
  const resolve = (name) => (refs.has(name) ? refs.get(name) : commits.has(name) ? name : null);
  const fresh = (id) => { let n = `${id}'`; while (commits.has(n)) n += "'"; return n; };

  for (const op of ops) {
    const [cmd, ...a] = op.trim().split(/\s+/);
    switch (cmd) {
      case 'init': break;
      case 'commit': { const t = tip(); add(a[0], t ? [t] : [], lane()); setTip(a[0]); break; }
      case 'branch': refs.set(a[0], tip()); break;
      case 'checkout': case 'switch': {
        if (a[0] === '-b' || a[0] === '-c') { refs.set(a[1], tip()); head.ref = a[1]; head.id = null; } else if (refs.has(a[0])) { head.ref = a[0]; head.id = null; } else if (commits.has(a[0])) { head.ref = null; head.id = a[0]; } else throw new Error(`unknown branch "${a[0]}"`);
        break;
      }
      case 'merge': {
        const noff = a[0] === '--no-ff';
        const [name, id] = noff ? a.slice(1) : a;
        const target = resolve(name);
        const cur = tip();
        if (!target) throw new Error(`unknown branch "${name}"`);
        if (cur && ancestors(cur).has(target)) break; // already up to date
        if (!cur || (!noff && ancestors(target).has(cur))) { setTip(target); break; } // fast-forward
        add(id || 'M', [cur, target], lane());
        setTip(id || 'M');
        break;
      }
      case 'rebase': {
        const onto = resolve(a[0]);
        const cur = tip();
        if (!onto) throw new Error(`unknown branch "${a[0]}"`);
        const base = ancestors(onto);
        const mine = [...ancestors(cur)].filter((c) => !base.has(c)).map((c) => commits.get(c)).filter((c) => c.parents.length === 1).sort((x, y) => x.order - y.order);
        if (!mine.length) { if (ancestors(onto).has(cur)) setTip(onto); break; }
        let parent = onto;
        for (const c of mine) { parent = add(fresh(c.id), [parent], lane()); }
        setTip(parent);
        break;
      }
      case 'reset': setTip(a[0]); break;
      case 'cherry-pick': { const nid = a[1] || fresh(a[0]); add(nid, [tip()], lane()); setTip(nid); break; }
      case 'tag': refs.set(`tag:${a[0]}`, tip()); break;
      case 'push': { const b = a[0] || head.ref; refs.set(`origin/${b}`, refs.get(b)); break; }
      case 'remote-commit': pending.push({ id: a[0], parent: pending.length ? pending.at(-1).id : refs.get('origin/main') ?? null }); break;
      case 'fetch': case 'pull': {
        for (const p of pending) add(p.id, p.parent ? [p.parent] : [], 'origin');
        if (pending.length) refs.set('origin/main', pending.at(-1).id);
        pending.length = 0;
        if (cmd === 'pull') {
          const target = refs.get('origin/main');
          const cur = tip();
          if (target && !(cur && ancestors(cur).has(target))) {
            if (!cur || ancestors(target).has(cur)) setTip(target); else { add('M', [cur, target], lane()); setTip('M'); }
          }
        }
        break;
      }
      default: throw new Error(`unknown git operation "${cmd}"`);
    }
  }
  return { commits: [...commits.values()].sort((x, y) => x.order - y.order), refs, head };
}

export function mount(host, { props: sc }) {
  const steps = sc.steps;
  const cum = [];
  let ops = [];
  for (const st of steps) { ops = ops.concat(st.do || []); cum.push(simulate(ops)); }

  const SP = 56; const LH = 82; const PADX = 34; const R = 15;
  const laneOrder = [];
  for (const m of cum) for (const c of m.commits) if (!laneOrder.includes(c.lane)) laneOrder.push(c.lane);
  laneOrder.sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a === 'origin' ? 1 : b === 'origin' ? -1 : 0));
  const maxCommits = Math.max(...cum.map((m) => m.commits.length));
  const W = PADX * 2 + Math.max(4, maxCommits) * SP;
  const H = laneOrder.length * LH + 22;
  const svg = s('svg', { class: 'git', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sc.title || 'Commit graph' });
  svg.style.maxWidth = `${Math.round(W * 1.3)}px`;
  host.append(h('div', { class: 'flow-wrap' }, svg));
  let prevIds = new Set();

  function go(i) {
    const m = cum[i];
    const idx = new Map(m.commits.map((c, k) => [c.id, k]));
    const X = (c) => PADX + idx.get(c.id) * SP;
    const Y = (c) => 56 + laneOrder.indexOf(c.lane) * LH;
    const reach = new Set();
    const mark = (id) => { if (!id || reach.has(id)) return; reach.add(id); for (const p of m.commits.find((c) => c.id === id)?.parents || []) mark(p); };
    for (const id of m.refs.values()) mark(id);
    mark(m.head.id);
    svg.replaceChildren();
    const byId = new Map(m.commits.map((c) => [c.id, c]));
    for (const c of m.commits) for (const p of c.parents) {
      const a = byId.get(p);
      const [x0, y0, x1, y1] = [X(a), Y(a), X(c), Y(c)];
      const d = y0 === y1 ? `M${x0} ${y0} L${x1} ${y1}` : `M${x0} ${y0} C${x0 + 34} ${y0}, ${x1 - 34} ${y1}, ${x1} ${y1}`;
      svg.append(s('path', { d, class: `git-edge${reach.has(c.id) && reach.has(p) ? '' : ' is-orphan'}` }));
    }
    for (const c of m.commits) {
      svg.append(s('g', { class: `git-commit tone-${'abcde'[laneOrder.indexOf(c.lane) % 5]}${reach.has(c.id) ? '' : ' is-orphan'}${prevIds.has(c.id) ? '' : ' is-new'}`, transform: `translate(${X(c)} ${Y(c)})` },
        s('circle', { r: R }), s('text', { y: 4, 'text-anchor': 'middle' }, c.id)));
    }
    // labels: branches, tags, remote refs, HEAD — stacked above their commit
    const stacks = new Map();
    const push = (id, text, cls) => { if (id && idx.has(id)) { const l = stacks.get(id) || []; l.push({ text, cls }); stacks.set(id, l); } };
    for (const [name, id] of m.refs) {
      const isHead = m.head.ref === name;
      push(id, isHead ? `HEAD → ${name}` : name.replace(/^tag:/, ''), isHead ? 'is-head' : name.startsWith('tag:') ? 'is-tag' : name.includes('/') ? 'is-remote' : '');
    }
    if (!m.head.ref && m.head.id) push(m.head.id, 'HEAD', 'is-head');
    for (const [id, list] of stacks) {
      const c = byId.get(id);
      list.forEach((lb, k) => {
        const w = lb.text.length * 6.6 + 14;
        const y = -R - 12 - k * 21;
        svg.append(s('g', { class: `git-ref ${lb.cls}`, transform: `translate(${X(c)} ${Y(c)})` }, s('rect', { x: -w / 2, y: y - 9, width: w, height: 18, rx: 9 }), s('text', { y: y + 4, 'text-anchor': 'middle' }, lb.text)));
      });
    }
    prevIds = new Set(m.commits.map((c) => c.id));
  }
  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { host.replaceChildren(); } };
}
