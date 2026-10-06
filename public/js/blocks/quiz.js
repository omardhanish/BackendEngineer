// "Quick check": one multiple-choice question. Wrong answers are marked, not punished; the right one explains itself.
import { h, icon, rich } from '../ui.js';
import { highlightLines } from '../markdown.js';

export function quizBlock(q) {
  let solved = false;
  const opts = q.options.map((text, i) => h('button', { class: 'q-opt', type: 'button', onclick: () => pick(i) },
    h('span', { class: 'q-key' }, String.fromCharCode(65 + i)), h('span', { class: 'q-text' }, rich(text)), h('kbd', { class: 'q-num' }, String(i + 1))));
  const feedback = h('div', { class: 'q-fb', 'aria-live': 'polite' });
  const reveal = h('button', { class: 'btn btn-quiet btn-xs', type: 'button', hidden: true, onclick: () => pick(q.answer) }, 'Show me the answer');

  function pick(i) {
    if (solved) return;
    if (i === q.answer) {
      solved = true;
      opts.forEach((o, k) => { o.classList.toggle('is-ok', k === q.answer); o.disabled = k !== q.answer && !o.classList.contains('is-bad'); o.setAttribute('aria-disabled', 'true'); });
      reveal.hidden = true;
      feedback.className = 'q-fb is-ok';
      feedback.replaceChildren(icon('check', 18), h('p', null, h('b', null, 'Right. '), rich(q.why || '')));
    } else {
      opts[i].classList.add('is-bad');
      opts[i].disabled = true;
      reveal.hidden = false;
      feedback.className = 'q-fb is-bad';
      feedback.replaceChildren(icon('x', 18), h('p', null, h('b', null, 'Not quite. '), 'Look at the code again and try another.'));
    }
  }

  const code = q.code
    ? h('pre', { class: 'q-code' }, h('code', null, highlightLines(q.code.replace(/\n$/, ''), q.lang || 'js').map((html) => h('span', { class: 'ln', html: html || ' ' }))))
    : null;
  const el = h('div', { class: 'quiz' },
    h('p', { class: 'label' }, icon('flag', 13), 'Quick check'),
    h('h3', { class: 'q-q' }, rich(q.q)), code,
    h('div', { class: 'q-opts', role: 'group', 'aria-label': 'Answers' }, opts), feedback, reveal);

  return {
    el,
    onKey(e) {
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= q.options.length && !e.shiftKey) { pick(Number(e.key) - 1); return true; }
      return false;
    },
  };
}
