// Challenges: small coding exercises inside the page. Each has starter code, tests that run in the isolated runner,
// a three-step hint ladder and a two-click "show solution". Passing every test marks it solved (saved with your
// progress). Drafts survive a reload. A challenge with mode "local" needs a real server, so it shows the starter and
// the tests to run on your own machine instead.
import { h, icon, rich, toast, debounce } from '../ui.js';
import { createEditor } from '../editor.js';
import { codeBlock } from './code.js';
import { runCode } from '../runner-host.js';
import { state } from '../state.js';
import { patchProgress } from '../progress.js';

let harnessText = null;
const loadHarness = async () => { harnessText ??= await (await fetch('/sandbox/harness.js')).text(); return harnessText; };
const draftKey = (topicId, cid) => `be:draft:${topicId}:${cid}`;
const readDraft = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeDraft = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } };

export function challengesBlock(t, ctx) {
  const items = t.challenges.items;
  const solved = new Set(Object.entries(state.progress.topics[t.id]?.solved || {}).filter(([, v]) => v).map(([k]) => k));
  const revealed = new Set();
  const views = new Map();
  let active = 0;

  const count = h('span', { class: 'ch-count' });
  const tabs = items.map((it, i) => h('button', { class: 'ch-tab', type: 'button', role: 'tab', 'aria-label': `Challenge ${i + 1}: ${it.title}`, title: it.title, onclick: () => open(i) }, String(i + 1)));
  const holder = h('div', { class: 'ch-holder', role: 'tabpanel' });

  function paintTabs() {
    count.textContent = `${solved.size} of ${items.length} solved`;
    tabs.forEach((b, i) => { b.classList.toggle('is-on', i === active); b.classList.toggle('is-solved', solved.has(items[i].id)); b.setAttribute('aria-selected', String(i === active)); });
  }

  function markSolved(id) {
    if (solved.has(id)) return;
    solved.add(id);
    patchProgress(t.id, { solved: { [id]: true } });
    if (solved.size === items.length) { patchProgress(t.id, { done: true }); toast('Every challenge solved. Nice work.', { kind: 'ok' }); }
    paintTabs();
  }

  function build(it) {
    if (it.mode === 'local') return buildLocal(it);
    const key = draftKey(t.id, it.id);
    const saved = readDraft(key);
    const start = typeof saved === 'string' && saved !== it.starterSource ? saved : it.starterSource;
    let running = null;
    let hintsShown = 0;
    let armed = false;
    let armTimer = 0;

    const ed = createEditor({
      value: start, lang: 'js', onRun: run, onEscape: () => ctx.focusStage?.(),
      onChange: (v) => { ctx.setLive?.({ code: v }); stash(v); resetBtn.hidden = v === it.starterSource; },
    });
    const stash = debounce((v) => writeDraft(key, v === it.starterSource ? null : v), 400);
    const results = h('div', { class: 'ch-results', 'aria-live': 'polite' }, h('p', { class: 'ch-idle' }, 'Run the tests to see how you are doing.'));
    const consoleBox = h('details', { class: 'ch-console', hidden: true }, h('summary', null, 'Console output'), h('pre'));
    const hintList = h('ol', { class: 'ch-hints' });
    const solutionBox = h('div', { class: 'ch-solution', hidden: true });

    const runBtn = h('button', { class: 'btn btn-run', type: 'button', onclick: run }, icon('play', 14), h('span', null, 'Run tests'), h('kbd', null, '⌘↵'));
    const resetBtn = h('button', { class: 'btn btn-quiet btn-xs', type: 'button', hidden: start === it.starterSource, onclick: () => { ed.setValue(it.starterSource); writeDraft(key, null); resetBtn.hidden = true; clear(); ctx.setLive?.({ code: it.starterSource, error: '' }); } }, icon('reset', 13), 'Start over');
    const hintBtn = h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: () => {
      if (hintsShown >= it.hints.length) return;
      hintList.append(h('li', null, rich(it.hints[hintsShown++])));
      hintBtn.textContent = hintsShown >= it.hints.length ? 'No more hints' : `Hint ${hintsShown + 1} of ${it.hints.length}`;
      hintBtn.disabled = hintsShown >= it.hints.length;
    } }, `Hint 1 of ${it.hints.length}`);
    const solBtn = h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: () => {
      if (!armed) {
        armed = true; solBtn.textContent = 'Really show it? Click again';
        armTimer = setTimeout(() => { armed = false; solBtn.textContent = 'Show solution'; }, 4000);
        return;
      }
      clearTimeout(armTimer);
      revealed.add(it.id);
      ctx.setLive?.({ revealed: [...revealed].join(',') });
      const cb = codeBlock({ file: `${it.id}.solution.js`, lang: 'js', source: it.solutionSource, run: 'static' }, ctx);
      solutionBox.replaceChildren(h('p', { class: 'label' }, 'One possible solution'), cb.el);
      solutionBox.hidden = false;
      solBtn.hidden = true;
    } }, 'Show solution');

    const win = h('div', { class: 'codewin is-editable' },
      h('div', { class: 'cw-bar' }, h('span', { class: 'cw-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { class: 'cw-file' }, `${it.id}.js`), h('span', { class: 'cw-lang' }, 'Your turn'), h('span', { class: 'cw-spacer' }), resetBtn),
      h('div', { class: 'cw-body is-editable' }, ed.el, ed.hint));

    function clear() {
      results.replaceChildren(h('p', { class: 'ch-idle' }, 'Run the tests to see how you are doing.'));
      consoleBox.hidden = true;
    }

    function show(payload, err, lines) {
      const out = [];
      if (payload) {
        const pass = payload.filter((r) => r.ok).length;
        const all = pass === payload.length;
        out.push(h('div', { class: `ch-sum ${all ? 'is-ok' : 'is-bad'}` }, icon(all ? 'check' : 'x', 16), h('b', null, all ? 'All tests pass' : `${pass} of ${payload.length} tests pass`)));
        out.push(h('ul', { class: 'ch-tests' }, payload.map((r) => h('li', { class: r.ok ? 'is-ok' : 'is-bad' }, icon(r.ok ? 'check' : 'x', 14), h('span', null, r.name, r.ok ? null : h('code', { class: 'ch-msg' }, r.msg))))));
        if (all) markSolved(it.id);
        const first = payload.find((r) => !r.ok);
        ctx.setLive?.({ challenge: it.id, error: all ? '' : `Challenge ${it.id}: ${pass}/${payload.length} tests pass. First failure: "${first.name}": ${first.msg}`.slice(0, 480) });
        if (!all && ctx.askError) out.push(h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: () => ctx.askError(`Challenge "${it.title}": ${pass} of ${payload.length} tests pass. First failure: "${first.name}": ${first.msg}`, ed.getValue()) }, icon('sparkle', 13), 'Ask about this'));
        else if (all && active < items.length - 1) out.push(h('button', { class: 'btn btn-primary btn-xs', type: 'button', onclick: () => open(active + 1) }, 'Next challenge', icon('arrow-right', 14)));
      } else if (err) {
        const text = `${err.name || 'Error'}: ${err.message || 'something went wrong'}${err.line ? ` (line ${err.line})` : ''}`;
        out.push(h('div', { class: 'ch-sum is-bad' }, icon('alert', 16), h('b', null, 'Your code could not finish')), h('p', { class: 'ch-err' }, text));
        if (ctx.askError) out.push(h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: () => ctx.askError(text, ed.getValue()) }, icon('sparkle', 13), 'Ask about this error'));
        ctx.setLive?.({ challenge: it.id, error: `Challenge ${it.id}: ${text}`.slice(0, 480) });
      }
      results.replaceChildren(...out);
      if (lines.length) { consoleBox.hidden = false; consoleBox.querySelector('pre').textContent = lines.join('\n'); } else consoleBox.hidden = true;
    }

    async function run() {
      if (running) { running.stop(); return; }
      results.replaceChildren(h('p', { class: 'ch-idle' }, 'Running…'));
      runBtn.classList.add('is-running');
      runBtn.querySelector('span').textContent = 'Stop';
      const harness = await loadHarness();
      const offset = harness.split('\n').length;
      const lines = [];
      let payload = null;
      const done = () => { running = null; runBtn.classList.remove('is-running'); runBtn.querySelector('span').textContent = 'Run tests'; };
      running = await runCode([harness, ed.getValue(), it.testsSource, 'await __finish();'].join('\n'), {
        onOut: (m) => { if (m.text.startsWith('@@RESULTS ')) { try { payload = JSON.parse(m.text.slice(10)); } catch { /* ignore a forged line */ } } else lines.push(m.text); },
        onEnd: (m) => {
          done();
          if (m.stopped) { results.replaceChildren(h('p', { class: 'ch-idle' }, 'Stopped.')); return; }
          if (!payload && m.error?.line) m.error.line = m.error.line > offset ? m.error.line - offset : null;
          show(payload, payload ? null : m.error || { message: 'The run ended without test results.' }, lines);
        },
      });
    }

    ctx.setLive?.({ code: start, challenge: it.id, error: '' });
    return {
      el: h('div', { class: 'ch-pane' },
        h('div', { class: 'ch-top' }, h('h3', { class: 'ch-title' }, it.title), h('p', { class: 'ch-prompt' }, rich(it.prompt))),
        h('div', { class: 'ch-grid' },
          h('div', { class: 'ch-left' }, win, h('div', { class: 'ch-actions' }, runBtn, hintBtn, solBtn)),
          h('div', { class: 'ch-right' }, results, consoleBox, hintList, solutionBox))),
      focus: () => ed.focus(),
      refit: () => ed.refit(),
      getCode: () => ed.getValue(),
      destroy: () => { running?.stop?.(); clearTimeout(armTimer); stash.flush?.(ed.getValue()); },
    };
  }

  function buildLocal(it) {
    let hintsShown = 0;
    const hintList = h('ol', { class: 'ch-hints' });
    const hintBtn = h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: () => {
      if (hintsShown >= it.hints.length) return;
      hintList.append(h('li', null, rich(it.hints[hintsShown++])));
      hintBtn.textContent = hintsShown >= it.hints.length ? 'No more hints' : `Hint ${hintsShown + 1} of ${it.hints.length}`;
      hintBtn.disabled = hintsShown >= it.hints.length;
    } }, `Hint 1 of ${it.hints.length}`);
    const solutionBox = h('div', { class: 'ch-solution', hidden: true });
    let armed = false;
    const solBtn = h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: () => {
      if (!armed) { armed = true; solBtn.textContent = 'Really show it? Click again'; setTimeout(() => { armed = false; solBtn.textContent = 'Show solution'; }, 4000); return; }
      revealed.add(it.id); ctx.setLive?.({ revealed: [...revealed].join(',') });
      solutionBox.replaceChildren(h('p', { class: 'label' }, 'One possible solution'), codeBlock({ file: it.file, lang: 'js', source: it.solutionSource, run: 'static' }, ctx).el);
      solutionBox.hidden = false; solBtn.hidden = true;
    } }, 'Show solution');
    const doneBtn = h('button', { class: 'btn btn-xs', type: 'button', onclick: () => { if (solved.has(it.id)) { solved.delete(it.id); patchProgress(t.id, { solved: { [it.id]: false } }); } else markSolved(it.id); doneBtn.textContent = solved.has(it.id) ? 'Marked as solved' : 'Mark as solved'; paintTabs(); } }, solved.has(it.id) ? 'Marked as solved' : 'Mark as solved');
    ctx.setLive?.({ code: it.starterSource, challenge: it.id, error: '' });
    return {
      el: h('div', { class: 'ch-pane is-local' },
        h('div', { class: 'ch-top' }, h('h3', { class: 'ch-title' }, it.title), h('p', { class: 'ch-prompt' }, rich(it.prompt))),
        h('p', { class: 'ch-how' }, icon('terminal', 15), 'This one needs a real server, so you build it on your machine. Save the two files below next to each other, then run ', h('code', { class: 'ic' }, `node ${it.tests}`), '.'),
        h('div', { class: 'ch-grid' },
          h('div', { class: 'ch-left' }, codeBlock({ file: it.file, lang: 'js', source: it.starterSource, run: 'static' }, ctx).el, h('div', { class: 'ch-actions' }, hintBtn, solBtn, doneBtn)),
          h('div', { class: 'ch-right' }, codeBlock({ file: it.tests, lang: 'js', source: it.testsSource, run: 'static' }, ctx).el, hintList, solutionBox))),
      focus: () => {}, refit: () => {}, getCode: () => it.starterSource, destroy: () => {},
    };
  }

  function open(i) {
    active = i;
    const it = items[i];
    if (!views.has(it.id)) views.set(it.id, build(it));
    const v = views.get(it.id);
    holder.replaceChildren(v.el);
    ctx.setLive?.({ code: v.getCode(), challenge: it.id });
    paintTabs();
    requestAnimationFrame(() => v.refit());
  }

  const first = Math.max(0, items.findIndex((it) => !solved.has(it.id)));
  const el = h('section', { class: 'frame frame-challenges', 'aria-label': 'Challenges' },
    h('div', { class: 'f-head' }, h('h2', { class: 'f-h2' }, 'Challenges'), count),
    t.challenges.intro ? h('p', { class: 'f-note' }, rich(t.challenges.intro)) : null,
    h('div', { class: 'ch-tabs', role: 'tablist', 'aria-label': 'Challenges' }, tabs),
    holder);
  open(first);

  return { el, destroy: () => views.forEach((v) => v.destroy()) };
}
