// A small code editor: a transparent <textarea> over a Prism-highlighted <pre>. Native caret, selection,
// undo and IME all keep working because the textarea is the real input. ~100 lines instead of a 300 KB dependency.
import { h } from './ui.js';
import { highlightCode } from './markdown.js';

export function createEditor({ value, lang, onRun, onChange, onEscape }) {
  const code = h('code');
  const pre = h('pre', { class: 'ed-hl', 'aria-hidden': 'true' }, code);
  const ta = h('textarea', {
    class: 'ed-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
    'aria-label': 'Code editor. Edit the code, then press Command or Control plus Enter to run it. Press Escape to leave.',
  });
  const hint = h('span', { class: 'ed-hint', hidden: true }, 'Tab indents · Esc, then Tab, leaves the editor');
  let armed = false; // Tab indents only after you start typing, so keyboard users are never trapped

  const paint = () => { code.innerHTML = highlightCode(ta.value + (ta.value.endsWith('\n') ? ' ' : '\n'), lang); };
  // The editor is built before its frame is on screen (a page transition can attach it a few frames later), so a
  // measurement taken at build time sees zero width and gives a tiny height. Measure only once it has real width,
  // and again whenever its width changes (text re-wraps) or the fonts finish loading.
  let lastW = -1;
  const size = () => {
    if (!ta.isConnected || !ta.clientWidth) return;
    lastW = ta.clientWidth;
    ta.style.height = 'auto';
    const hgt = ta.scrollHeight;
    ta.style.height = `${hgt}px`;
    pre.style.height = `${hgt}px`;
  };
  const set = (v) => { ta.value = v; paint(); size(); };
  ta.value = value;

  ta.addEventListener('input', () => { armed = true; hint.hidden = false; paint(); size(); onChange?.(ta.value); });
  ta.addEventListener('blur', () => { armed = false; hint.hidden = true; });
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    if (e.key === 'Escape') { armed = false; hint.hidden = true; e.preventDefault(); onEscape?.(); return; }
    if (e.key === 'Tab' && armed && !e.shiftKey) { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.isComposing) {
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      const indent = (/^\s*/.exec(line) || [''])[0] + (/[{[(]\s*$/.test(line) ? '  ' : '');
      e.preventDefault();
      document.execCommand('insertText', false, `\n${indent}`);
    }
  });

  const el = h('div', { class: 'editor' }, pre, ta);
  paint();
  new ResizeObserver(() => { if (ta.clientWidth !== lastW) size(); }).observe(ta);
  document.fonts?.ready.then(() => { lastW = -1; size(); });
  requestAnimationFrame(size);
  return { el, hint, getValue: () => ta.value, setValue: set, focus: () => ta.focus(), refit: size };
}
