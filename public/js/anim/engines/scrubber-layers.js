// scrubber · layers — the Docker build cache, simulated exactly the way Docker decides.
// A layer is rebuilt when (a) there is no cache yet, (b) a file it copies changed, (c) its own line changed,
// or (d) ANY layer above it was rebuilt. That last rule is the whole lesson.
//
// scenario = {
//   kind: 'layers',
//   layers: [{cmd, cost?: seconds, watch?: [files…]}],      // watch: files this COPY depends on; '*' = any file; 'dir/' = a folder
//   steps: [{caption, edited: ['*initial*' | 'src/app.js' | 'line:3' …]}]  // 'line:N' = the Nth instruction itself was edited
// }
import { h } from '../../ui.js';

/** Pure rule, exported for tests: which layers run again after `edited`? (true = rebuilt) */
export function plan(layers, edited) {
  let invalid = edited.includes('*initial*');
  return layers.map((l, j) => {
    const touched = (l.watch || []).some((w) => (w === '*' ? edited.some((e) => e !== '*initial*') : edited.some((e) => e === w || (w.endsWith('/') && e.startsWith(w))))) || edited.includes(`line:${j + 1}`);
    if (touched) invalid = true;
    return invalid;
  });
}

export function mount(host, { props: sc }) {
  const steps = sc.steps;
  const layers = sc.layers;
  const cold = layers.reduce((n, l) => n + (l.cost || 0), 0);

  const rows = layers.map((l, j) => {
    const [word, ...rest] = l.cmd.split(' ');
    const chip = h('span', { class: 'ly-chip' });
    const el = h('li', { class: 'ly-row' }, h('span', { class: 'ly-n' }, j + 1), h('code', { class: 'ly-cmd' }, h('b', null, word), ` ${rest.join(' ')}`), chip);
    return { el, chip };
  });
  const edits = h('div', { class: 'ly-edits' });
  const time = h('div', { class: 'ly-time' });
  host.append(h('div', { class: 'ly' },
    h('div', { class: 'ly-main' }, h('div', { class: 'eng-label' }, 'Dockerfile, top to bottom'), h('ol', { class: 'ly-list' }, rows.map((r) => r.el))),
    h('div', { class: 'ly-side' }, edits, time)));

  function go(i) {
    const edited = steps[i].edited || [];
    const built = plan(layers, edited);
    let spent = 0;
    rows.forEach((r, j) => {
      r.el.classList.toggle('is-built', built[j]);
      r.el.classList.toggle('is-cached', !built[j]);
      const cost = layers[j].cost || 0;
      if (built[j]) spent += cost;
      r.chip.textContent = built[j] ? (cost ? `runs · ${cost}s` : 'runs') : 'cached';
    });
    const initial = edited.includes('*initial*');
    edits.replaceChildren(
      h('div', { class: 'eng-label' }, 'What changed'),
      initial ? h('p', { class: 'ly-note' }, 'First build: the cache is empty.')
        : !edited.length ? h('p', { class: 'ly-note' }, 'Nothing changed.')
          : h('div', { class: 'ly-files' }, edited.map((e) => h('code', null, e.startsWith('line:') ? `edited line ${e.slice(5)}` : e))));
    time.replaceChildren(
      h('div', { class: 'eng-label' }, 'Build time'),
      h('div', { class: 'ly-big' }, `${spent}s`),
      h('div', { class: 'ly-bar', 'aria-hidden': 'true' }, h('i', { style: { width: `${cold ? (100 * spent) / cold : 0}%` } })),
      h('p', { class: 'ly-note' }, `cold build: ${cold}s`));
  }
  return { steps: steps.length, go, caption: (i) => steps[i].caption, destroy() { host.replaceChildren(); } };
}
