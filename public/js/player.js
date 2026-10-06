// Shared stepping + figure shell. Every steppable visual (animations, flows, walkthroughs) uses the
// same controls, caption bar and keyboard behaviour, so authors only describe steps.
import { h, icon, clamp, reducedMotion, rich } from './ui.js';

/** Index-in-range state machine with optional autoplay. `go(i)` is the only way the index changes. */
export function createStepper(count, onChange) {
  let index = 0;
  let timer = null;
  let speed = 1;
  const subs = new Set();
  const notify = () => subs.forEach((f) => f(index));
  const api = {
    count,
    get index() { return index; },
    get playing() { return timer !== null; },
    go(i) {
      const n = clamp(i, 0, count - 1);
      if (n === index) return false;
      index = n;
      onChange?.(n);
      notify();
      return true;
    },
    next() { return index < count - 1 && api.go(index + 1); },
    prev() { return index > 0 && api.go(index - 1); },
    play() {
      if (timer || count < 2 || reducedMotion()) return;
      if (index >= count - 1) api.go(0);
      timer = setInterval(() => { if (!api.next()) api.pause(); }, 2000 / speed);
      notify();
    },
    pause() { if (timer) { clearInterval(timer); timer = null; notify(); } },
    toggle() { if (api.playing) api.pause(); else api.play(); },
    setSpeed(s) { speed = s; if (timer) { api.pause(); api.play(); } },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    refresh() { onChange?.(index); notify(); },
    destroy() { if (timer) clearInterval(timer); timer = null; subs.clear(); },
  };
  return api;
}

const ctl = (name, label, fn) => h('button', { class: 'ctl', type: 'button', 'aria-label': label, title: label, onclick: fn }, icon(name, 16));

/**
 * A captioned figure: header, visual body, caption bar and (for >1 step) controls.
 * @param {{label:string, tag?:string, count:number, render:(i:number)=>void, caption:(i:number)=>string, body:Node, onDestroy?:()=>void, className?:string}} o
 */
export function createFigure({ label, tag, count, render, caption, body, onDestroy, className = '' }) {
  const stepper = createStepper(count, (i) => render(i));
  const cap = h('p', { class: 'fig-cap-text' });
  const stepNo = h('span', { class: 'fig-step' });
  const playBtn = ctl('play', 'Play (P)', () => stepper.toggle());
  const firstBtn = ctl('skip-back', 'First step', () => stepper.go(0));
  const prevBtn = ctl('step-back', 'Previous step (←)', () => stepper.prev());
  const nextBtn = ctl('step-forward', 'Next step (→)', () => stepper.next());
  const lastBtn = ctl('skip-forward', 'Last step', () => stepper.go(count - 1));
  const speed = h('select', { class: 'ctl-speed', 'aria-label': 'Speed', onchange: (e) => stepper.setSpeed(Number(e.target.value)) },
    ...[['0.5', '0.5×'], ['1', '1×'], ['2', '2×']].map(([v, t]) => h('option', { value: v, selected: v === '1' }, t)));
  const dots = count > 1 && count <= 14
    ? h('div', { class: 'fig-dots', role: 'tablist', 'aria-label': 'Steps' }, Array.from({ length: count }, (_, i) => h('button', { class: 'fig-dot', type: 'button', role: 'tab', 'aria-label': `Step ${i + 1}`, onclick: () => stepper.go(i) })))
    : null;

  const controls = count > 1
    ? h('div', { class: 'fig-ctl' }, firstBtn, prevBtn, playBtn, nextBtn, lastBtn, dots, stepNo, speed)
    : null;

  const el = h('figure', { class: `fig ${className}`.trim() },
    h('figcaption', { class: 'fig-head' }, h('span', { class: 'fig-label' }, label), tag ? h('span', { class: 'fig-tag' }, tag) : null, count > 1 ? h('span', { class: 'fig-hint' }, h('kbd', null, '→'), ' step') : null),
    h('div', { class: 'fig-body' }, body),
    h('div', { class: 'fig-bar' }, h('div', { class: 'fig-cap', 'aria-live': 'polite', 'aria-atomic': 'true' }, cap), controls));

  function paint() {
    const i = stepper.index;
    cap.replaceChildren(...rich(caption(i) || ''));
    stepNo.textContent = `${i + 1} / ${count}`;
    prevBtn.disabled = firstBtn.disabled = i === 0;
    nextBtn.disabled = lastBtn.disabled = i === count - 1;
    const playing = stepper.playing;
    playBtn.replaceChildren(icon(playing ? 'pause' : 'play', 16));
    playBtn.setAttribute('aria-label', playing ? 'Pause (P)' : 'Play (P)');
    playBtn.hidden = reducedMotion();
    dots?.querySelectorAll('.fig-dot').forEach((d, j) => {
      d.classList.toggle('is-on', j === i);
      d.classList.toggle('is-past', j < i);
      d.setAttribute('aria-selected', String(j === i));
    });
  }
  stepper.subscribe(paint);
  render(0);
  paint();

  return {
    el,
    stepper,
    transcript: () => Array.from({ length: count }, (_, i) => caption(i)).filter(Boolean).join(' '),
    destroy() { stepper.destroy(); onDestroy?.(); },
  };
}
