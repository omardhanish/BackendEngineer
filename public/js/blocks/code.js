// Code windows. Three honest modes:
//   run: "browser"  → editable, runs in the isolated in-browser runner (Node-like shims included)
//   run: "captured" → static code; "Run" replays the output recorded from a REAL Node run at build time
//   (none)          → static code; badge says "Illustrative" when it cannot be run here (Docker, AWS…)
// A `walk` adds a step-through: highlighted lines + one sentence per step.
import { h, icon, sleep, copyText, toast, rich } from '../ui.js';
import { highlightLines } from '../markdown.js';
import { LANGUAGES, LANGUAGE_ID } from '../languages.js';
import { createEditor } from '../editor.js';
import { runCode } from '../runner-host.js';
import { createStepper } from '../player.js';

const langLabel = (lang) => LANGUAGES[LANGUAGE_ID(lang)]?.label || lang;

// "· Node 20.20.2 · PostgreSQL 18.4" for a script, "· git 2.47.0" for a shell transcript
function realLabel(sn) {
  const c = sn.captured || {};
  const parts = /\.sh$/.test(sn.file) ? [c.tool] : [c.node ? `Node ${c.node.split('.').slice(0, 2).join('.')}` : null, c.tool];
  const text = parts.filter(Boolean).join(' · ');
  return text ? ` · ${text}` : '';
}

function outputPanel() {
  const body = h('div', { class: 'out-lines', 'aria-live': 'polite' });
  const head = h('div', { class: 'out-head' }, icon('terminal', 13), h('span', null, 'Output'));
  const el = h('div', { class: 'cw-out', hidden: true }, head, body);
  let count = 0;
  let lastLine = null;
  const show = () => { el.hidden = false; };
  return {
    el, head,
    get count() { return count; },
    clear() { body.replaceChildren(); count = 0; lastLine = null; el.hidden = true; },
    add(text, level = 'log', raw = false) {
      show();
      if (raw && lastLine && lastLine.dataset.raw) { lastLine.append(text); return; }
      lastLine = h('div', { class: `oline lv-${level}`, dataset: raw ? { raw: '1' } : {} }, text);
      body.append(lastLine);
      count++;
    },
    note(text) { show(); body.append(h('div', { class: 'oline lv-note' }, text)); },
    error(text, onAsk) {
      show();
      body.append(h('div', { class: 'oline lv-fail' }, icon('alert', 14), h('span', null, text), onAsk ? h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: onAsk }, icon('sparkle', 13), 'Ask about this error') : null));
      count++;
    },
  };
}

/** @param {object} sn snippet {file, lang, caption, source, run, captured, illustrative, walk} */
export function codeBlock(sn, ctx = {}) {
  const lang = sn.lang || 'js';
  const editable = sn.run === 'browser';
  const out = outputPanel();
  let ed = null;
  let handle = null;
  let dirty = false;

  const runBtn = h('button', { class: 'btn btn-run', type: 'button', onclick: () => (editable ? runBrowser() : replay()) }, icon('play', 14), h('span', null, 'Run'), editable ? h('kbd', null, '⌘↵') : null);
  const resetBtn = h('button', { class: 'btn btn-quiet btn-xs', type: 'button', hidden: true, onclick: () => { ed.setValue(sn.source); dirty = false; resetBtn.hidden = true; out.clear(); } }, icon('reset', 13), 'Reset');
  const copyBtn = h('button', { class: 'ctl ctl-sm', type: 'button', 'aria-label': 'Copy code', title: 'Copy code', onclick: async () => { if (await copyText(getCode())) toast('Code copied'); } }, icon('copy', 15));

  const badge = editable ? h('span', { class: 'cw-badge is-live', title: 'Edit it and press Run. It runs safely inside your browser.' }, icon('sparkle', 12), 'Live · edit me')
    : sn.run === 'captured' ? h('span', { class: 'cw-badge is-real', title: 'Recorded from a real run while building the book.' }, icon('check', 12), `Real output${realLabel(sn)}`)
      : sn.illustrative ? h('span', { class: 'cw-badge is-ill', title: 'Docker, AWS and databases cannot run inside this book.' }, icon('eye', 12), 'Illustrative') : null;

  let bodyEl;
  let lineEls = [];
  if (editable) {
    ed = createEditor({
      value: sn.source, lang, onRun: runBrowser, onEscape: () => ctx.focusStage?.(),
      onChange: (v) => { dirty = v !== sn.source; resetBtn.hidden = !dirty; ctx.setLive?.({ code: v }); },
    });
    bodyEl = h('div', { class: 'cw-body is-editable' }, ed.el, ed.hint);
  } else {
    const lines = highlightLines(sn.source.replace(/\n$/, ''), lang);
    lineEls = lines.map((html, i) => h('span', { class: 'ln', dataset: { n: i + 1 }, html: html || ' ' }));
    bodyEl = h('div', { class: 'cw-body' }, h('pre', { class: 'cw-pre' }, h('code', null, lineEls)));
  }

  const win = h('div', { class: `codewin${editable ? ' is-editable' : ''}` },
    h('div', { class: 'cw-bar' },
      h('span', { class: 'cw-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', { class: 'cw-file' }, sn.file),
      h('span', { class: 'cw-lang' }, langLabel(lang)),
      badge,
      h('span', { class: 'cw-spacer' }), resetBtn, copyBtn,
      editable || sn.run === 'captured' ? runBtn : null),
    bodyEl, out.el);

  function getCode() { return ed ? ed.getValue() : sn.source; }

  async function runBrowser() {
    if (handle) { handle.stop(); return; }
    out.clear();
    ctx.setLive?.({ error: '' });
    runBtn.classList.add('is-running');
    runBtn.querySelector('span').textContent = 'Stop';
    const done = () => { handle = null; runBtn.classList.remove('is-running'); runBtn.querySelector('span').textContent = 'Run'; };
    handle = await runCode(ed.getValue(), {
      onOut: (m) => out.add(m.text, m.level, m.raw),
      onEnd: (m) => {
        done();
        if (m.stopped) out.note('Stopped.');
        else if (!m.ok) {
          const e = m.error || {};
          const text = `${e.name || 'Error'}: ${e.message || 'something went wrong'}${e.line ? `  (line ${e.line})` : ''}`;
          out.error(text, ctx.askError ? () => ctx.askError(text, ed.getValue()) : null);
          ctx.setLive?.({ error: text });
        } else if (!out.count) out.note('Ran with no output. Add a console.log to see something.');
      },
    });
  }

  async function replay() {
    if (handle) return;
    out.clear();
    const cap = sn.captured;
    if (!cap) { out.note('Output has not been captured for this example yet.'); return; }
    handle = true;
    runBtn.disabled = true;
    if (!/\.sh$/.test(sn.file)) out.add(`$ ${cap.command || `node ${sn.file}`}`, 'cmd'); // a shell transcript already contains its own "$ command" lines
    for (const line of (cap.stdout || '').replace(/\n$/, '').split('\n')) { if (line === '' && !cap.stdout) break; await sleep(65); out.add(line, line.startsWith('$ ') ? 'cmd' : 'log'); }
    for (const line of (cap.stderr || '').replace(/\n$/, '').split('\n').filter(Boolean)) { await sleep(65); out.add(line, 'error'); }
    handle = null;
    runBtn.disabled = false;
  }

  // ---- walkthrough: highlight lines, one sentence per step
  let stepper = null;
  let root = win;
  if (sn.walk?.length && !editable) {
    const items = sn.walk.map((w, i) => h('li', { class: 'walk-item' }, h('button', { type: 'button', class: 'walk-btn', onclick: () => stepper.go(i) }, h('span', { class: 'walk-n' }, i + 1), h('span', { class: 'walk-text' }, rich(w.text)))));
    const paint = (i) => {
      const on = new Set(sn.walk[i].lines || []);
      lineEls.forEach((el, n) => { el.classList.toggle('is-hl', on.has(n + 1)); el.classList.toggle('is-dim', !on.has(n + 1)); });
      items.forEach((li, k) => { li.classList.toggle('is-on', k === i); li.classList.toggle('is-past', k < i); });
      items[i].scrollIntoView?.({ block: 'nearest' });
    };
    stepper = createStepper(sn.walk.length, paint);
    paint(0);
    root = h('div', { class: 'code-walk' },
      h('div', { class: 'walk' }, h('div', { class: 'walk-head' }, h('span', { class: 'label' }, 'Line by line'), h('span', { class: 'fig-hint' }, h('kbd', null, '→'), ' next')), h('ol', { class: 'walk-list' }, items)),
      win);
  }

  return {
    el: root, stepper, getCode,
    destroy() { handle?.stop?.(); stepper?.destroy(); },
  };
}
