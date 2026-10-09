// Turns one page of content into its deck of frames. Authors fill slots; this file owns the layout.
//   Core idea → How it works → In code → Watch out · Check        (role-play: Scenario → Artifact → Rubric)
import { h, icon, pad2, rich } from './ui.js';
import { paths } from './paths.js';
import { animBlock } from './blocks/anim.js';
import { flowBlock, seqBlock, timelineBlock, compareBlock, tableBlock, anatomyBlock } from './blocks/visuals.js';
import { codeBlock } from './blocks/code.js';
import { quizBlock } from './blocks/quiz.js';
import { challengesBlock } from './blocks/challenges.js';
import { scenarioIntro, scenarioArtifact, scenarioRubric } from './blocks/scenario.js';

const KIND_CHIP = { roleplay: 'Role-play', challenge: 'Challenge', bonus: 'Bonus' };

export async function heroBlock(spec) {
  switch (spec.type) {
    case 'anim': return animBlock(spec);
    case 'flow': return flowBlock(spec);
    case 'seq': return seqBlock(spec);
    case 'timeline': return timelineBlock(spec);
    case 'compare': return compareBlock(spec);
    case 'table': return tableBlock(spec);
    case 'anatomy': return anatomyBlock(spec);
    default: throw new Error(`Unknown visual type "${spec.type}"`);
  }
}

const kicker = (t) => h('p', { class: 'kicker' }, `${pad2(t.chapter.n)} · ${t.chapter.title}`, h('span', { class: 'kicker-dot', 'aria-hidden': 'true' }, '·'), `Page ${t.position.index}`);

function ideaFrame(t) {
  const chips = [t.lecture ? `Lecture ${t.lecture}` : null, KIND_CHIP[t.kind]].filter(Boolean);
  const el = h('section', { class: `frame frame-idea${t.analogy ? '' : ' no-aside'}`, 'aria-label': 'Core idea' },
    h('div', { class: 'f-col f-main' },
      kicker(t),
      h('h1', { class: 'f-title' }, t.title),
      t.idea ? h('p', { class: 'f-idea' }, rich(t.idea)) : null,
      chips.length ? h('div', { class: 'f-chips' }, chips.map((c) => h('span', { class: 'chip' }, c))) : null),
    t.analogy ? h('aside', { class: 'f-col f-aside' },
      h('div', { class: 'analogy' },
        h('span', { class: 'analogy-label' }, icon('quote', 14), 'Think of it like'),
        h('p', { class: 'analogy-text' }, rich(t.analogy.text)),
        t.analogy.breaks ? h('p', { class: 'analogy-breaks' }, h('b', null, 'Where it breaks: '), rich(t.analogy.breaks)) : null)) : null);
  return { el };
}

async function howFrame(t) {
  const fig = t.hero ? await heroBlock(t.hero) : null;
  // engines that need width (lanes, memory, pipeline…) get the whole row; the points tuck into a compact grid above
  const wide = t.hero?.type === 'anim' && ['lanes', 'memory', 'pipeline', 'topology', 'scrubber'].includes(t.hero.engine);
  const el = h('section', { class: `frame frame-how${fig ? '' : ' no-hero'}${wide ? ' is-wide' : ''}`, 'aria-label': 'How it works' },
    h('div', { class: 'f-col f-main' },
      h('h2', { class: 'f-h2' }, 'How it works'),
      t.points?.length ? h('ol', { class: 'f-points' }, t.points.map((p, i) => h('li', null, h('span', { class: 'f-pt-n' }, i + 1), h('span', { class: 'f-pt-t' }, rich(p))))) : null),
    fig ? h('div', { class: 'f-col f-hero' }, fig.el) : null);
  return { el, get stepper() { return fig?.stepper; }, destroy: () => fig?.destroy() };
}

function codeFrame(t, ctx) {
  const blocks = (t.code || []).map((sn) => codeBlock(sn, ctx));
  let active = 0;
  const tabs = blocks.length > 1
    ? h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Examples' }, t.code.map((sn, i) => h('button', { class: `tab${i === 0 ? ' is-on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(i === 0), onclick: () => show(i) }, sn.title || sn.file)))
    : null;
  const holder = h('div', { class: 'code-holder' }, blocks[0]?.el);
  const caption = h('p', { class: 'f-note' }, rich(t.code?.[0]?.caption || ''));
  function show(i) {
    active = i;
    holder.replaceChildren(blocks[i].el);
    caption.replaceChildren(...rich(t.code[i].caption || ''));
    tabs?.querySelectorAll('.tab').forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', String(k === i)); });
    ctx.setLive({ code: blocks[i].getCode(), error: '' });
    ctx.refresh?.();
  }
  ctx.setLive({ code: blocks[0]?.getCode?.() || '' });
  const el = h('section', { class: 'frame frame-code', 'aria-label': 'In code' },
    h('div', { class: 'f-head' }, h('h2', { class: 'f-h2' }, 'In code'), tabs),
    caption, holder);
  return { el, get stepper() { return blocks[active]?.stepper; }, destroy: () => blocks.forEach((b) => b.destroy()) };
}

function checkFrame(t) {
  const quiz = t.quiz ? quizBlock(t.quiz) : null;
  const el = h('section', { class: `frame frame-check${quiz ? '' : ' no-quiz'}`, 'aria-label': 'Watch out and check' },
    h('div', { class: 'f-col f-main' },
      t.pitfalls?.length ? [h('h2', { class: 'f-h2' }, 'Watch out'), h('ul', { class: 'pitfalls' }, t.pitfalls.map((p) => h('li', null, h('span', { class: 'pit-ico' }, icon('alert', 16)), h('span', null, rich(p)))))] : null,
      t.takeaway ? h('p', { class: 'takeaway' }, h('b', null, 'Remember'), rich(t.takeaway)) : null),
    quiz ? h('div', { class: 'f-col f-hero' }, quiz.el) : null);
  return { el, onKey: (e) => quiz?.onKey(e) ?? false };
}

function soonFrame(t, ctx) {
  const el = h('section', { class: 'frame frame-soon', 'aria-label': 'Coming soon' },
    h('div', { class: 'f-col f-main' },
      kicker(t),
      h('h1', { class: 'f-title' }, t.title),
      h('p', { class: 'f-idea' }, 'This page is still being written.'),
      h('p', { class: 'f-note' }, 'The tutor already knows this topic and can teach it now. Ask it anything, or open another page.'),
      h('div', { class: 'sc-cta' },
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => ctx.openChat() }, icon('chat', 18), 'Ask the tutor about this'),
        h('a', { class: 'btn', href: paths.chapter(t.chapter.id) }, 'Back to the chapter'))));
  return { el };
}

/** @returns {Array<{key:string,label:string,build:(ctx)=>Promise<object>|object}>} */
export function buildFrames(t) {
  if (!t.authored) return [{ key: 'soon', label: 'Coming soon', build: (ctx) => soonFrame(t, ctx) }];
  if (t.kind === 'roleplay' && t.scenario) {
    return [
      { key: 'scenario', label: 'Scenario', build: (ctx) => scenarioIntro(t, ctx) },
      { key: 'artifact', label: 'The artifact', build: (ctx) => scenarioArtifact(t, ctx) },
      { key: 'rubric', label: 'Your rubric', build: (ctx) => scenarioRubric(t, ctx) },
    ];
  }
  const frames = [{ key: 'idea', label: 'Core idea', build: () => ideaFrame(t) }];
  if (t.points?.length || t.hero) frames.push({ key: 'how', label: 'How it works', build: () => howFrame(t) });
  if (t.code?.length) frames.push({ key: 'code', label: 'In code', build: (ctx) => codeFrame(t, ctx) });
  if (t.challenges?.items?.length) frames.push({ key: 'challenges', label: 'Challenges', build: (ctx) => { const b = challengesBlock(t, ctx); return { el: b.el, destroy: b.destroy }; } });
  if (t.pitfalls?.length || t.quiz) frames.push({ key: 'check', label: 'Watch out · Check', build: () => checkFrame(t) });
  return frames;
}
