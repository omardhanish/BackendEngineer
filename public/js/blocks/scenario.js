// Role-play pages: a scenario card, the artifact to review, and a self-check rubric.
// The persona, hidden facts and answer key live on the server only; this file shows what the learner may see.
import { h, icon, rich } from '../ui.js';
import { codeBlock } from './code.js';

const store = {
  get(id) { try { return JSON.parse(localStorage.getItem(`be:rubric:${id}`) || '[]'); } catch { return []; } },
  set(id, v) { try { localStorage.setItem(`be:rubric:${id}`, JSON.stringify(v)); } catch { /* not persisted */ } },
};

export function scenarioIntro(t, ctx) {
  const sc = t.scenario || {};
  const el = h('section', { class: 'frame frame-scenario', 'aria-label': 'Scenario' },
    h('div', { class: 'f-col f-main' },
      h('p', { class: 'kicker' }, icon('user', 14), 'Role-play'),
      h('h1', { class: 'f-title' }, t.title),
      sc.brief ? h('p', { class: 'f-idea' }, rich(sc.brief)) : null,
      h('div', { class: 'sc-cta' },
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => ctx.openChat() }, icon('chat', 18), 'Open the conversation'),
        h('span', { class: 'muted' }, 'The other person speaks first. Reply in the chat.'))),
    h('aside', { class: 'f-col f-aside sc-cards' },
      sc.role ? h('div', { class: 'sc-card' }, h('span', { class: 'label' }, 'Your role'), h('p', null, rich(sc.role))) : null,
      sc.goal ? h('div', { class: 'sc-card' }, h('span', { class: 'label' }, 'Your goal'), h('p', null, rich(sc.goal))) : null,
      sc.rules?.length ? h('div', { class: 'sc-card' }, h('span', { class: 'label' }, 'How to play'), h('ul', null, sc.rules.map((r) => h('li', null, rich(r))))) : null));
  return { el };
}

export function scenarioArtifact(t, ctx) {
  const sc = t.scenario || {};
  const sn = t.code?.[sc.artifact ?? 0];
  const block = sn ? codeBlock(sn, ctx) : null;
  const el = h('section', { class: 'frame frame-artifact', 'aria-label': 'The artifact' },
    h('div', { class: 'f-col f-main' }, h('h2', { class: 'f-h2' }, sc.artifactTitle || 'What you are reviewing'), sc.artifactNote ? h('p', { class: 'f-note' }, rich(sc.artifactNote)) : null,
      h('p', { class: 'muted' }, 'Read it like a reviewer. Raise each concern with the other person in the chat; you will be scored on what you found.')),
    h('div', { class: 'f-col f-hero' }, block ? block.el : h('p', { class: 'muted' }, 'No artifact yet.')));
  return { el, destroy: () => block?.destroy?.() };
}

export function scenarioRubric(t, ctx) {
  const rubric = t.scenario?.rubric || [];
  let marks = store.get(t.id);
  const total = h('span', { class: 'rb-total' });
  const rows = rubric.map((r, i) => {
    const pills = [0, 1, 2].map((lv) => h('button', { class: 'rb-pill', type: 'button', title: r.levels?.[lv] || '', 'aria-label': `${lv}: ${r.levels?.[lv] || ''}`, onclick: () => { marks[i] = marks[i] === lv ? null : lv; store.set(t.id, marks); paint(); } }, String(lv)));
    const desc = h('p', { class: 'rb-desc' });
    const row = h('li', { class: 'rb-row' }, h('div', { class: 'rb-head' }, h('b', null, r.criterion), h('div', { class: 'rb-pills', role: 'group', 'aria-label': `Score for ${r.criterion}` }, pills)), desc);
    return { row, pills, desc, r, i };
  });
  function paint() {
    let sum = 0; let n = 0;
    for (const { pills, desc, r, i } of rows) {
      const v = marks[i];
      pills.forEach((p, lv) => { p.classList.toggle('is-on', v === lv); p.setAttribute('aria-pressed', String(v === lv)); });
      desc.textContent = v == null ? (r.levels?.[2] ? `Top score: ${r.levels[2]}` : '') : r.levels?.[v] || '';
      if (v != null) { sum += v; n++; }
    }
    total.replaceChildren(`${sum} / ${rubric.length * 2}`, n < rubric.length ? h('small', null, `${rubric.length - n} unmarked`) : null);
  }
  paint();
  const el = h('section', { class: 'frame frame-rubric', 'aria-label': 'Your rubric' },
    h('div', { class: 'f-col f-main' }, h('h2', { class: 'f-h2' }, 'How you will be judged'), h('p', { class: 'muted' }, 'Mark yourself honestly as you go (0 to 2). When you are done, ask for the debrief and compare notes.'),
      h('div', { class: 'rb-foot' }, total, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => ctx.debrief() }, icon('sparkle', 16), 'End and debrief'))),
    h('div', { class: 'f-col f-hero' }, h('ol', { class: 'rb-list' }, rows.map((x) => x.row))));
  return { el };
}
