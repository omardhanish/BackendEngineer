// Chapter cover: big numeral, promise, outcomes, and the page list with progress.
import { h, icon, pad2, applyHue } from '../ui.js';
import { chapterOf, topicsOf, chapterStats, isDone, isVisited } from '../state.js';
import { shell } from '../shell.js';

const KIND = { roleplay: 'Role-play', challenge: 'Challenge', bonus: 'Bonus' };

export function chapterView(chId) {
  const ch = chapterOf(chId);
  if (!ch) {
    shell.stage.replaceChildren(h('div', { class: 'empty-state' }, h('h1', null, 'No such chapter'), h('a', { class: 'btn btn-primary', href: '/' }, 'Back to the bookshelf')));
    return {};
  }
  applyHue(ch.hue);
  shell.setCrumbs([{ label: 'Bookshelf', href: '/' }, { label: `${pad2(ch.n)} · ${ch.title}` }]);
  const topics = topicsOf(ch.id);
  const st = chapterStats(ch.id);
  const next = topics.find((t) => t.authored && !isDone(t.id)) || topics.find((t) => t.authored);
  const resuming = st.visited > 0 && next;

  const rows = topics.map((t) => h('li', null,
    h('a', { class: `ch-row${t.authored ? '' : ' is-soon'}`, href: `/read/${t.id}` },
      h('span', { class: `ch-status ${isDone(t.id) ? 'is-done' : isVisited(t.id) ? 'is-seen' : ''}`, 'aria-hidden': 'true' }, isDone(t.id) ? icon('check', 12) : ''),
      h('span', { class: 'ch-n' }, pad2(t.n)),
      h('span', { class: 'ch-title' }, t.title),
      KIND[t.kind] ? h('span', { class: `badge badge-${t.kind}` }, KIND[t.kind]) : null,
      t.authored ? null : h('span', { class: 'ch-soon' }, 'soon'))));

  const view = h('div', { class: 'cover' },
    h('header', { class: 'cover-hero' },
      h('span', { class: 'cover-num', 'aria-hidden': 'true' }, pad2(ch.n)),
      h('div', { class: 'cover-copy' },
        h('p', { class: 'eyebrow' }, `Chapter ${ch.n}`),
        h('h1', { class: 'cover-title' }, ch.title),
        h('p', { class: 'cover-tag' }, ch.tagline),
        h('div', { class: 'cover-cta' },
          next ? h('a', { class: 'btn btn-primary btn-lg', href: `/read/${next.id}` }, resuming ? 'Continue chapter' : 'Start chapter', icon('arrow-right', 18)) : h('span', { class: 'muted' }, 'This chapter is still being written.'),
          h('span', { class: 'cover-meta' }, `${st.total} pages · ${st.written} written · ${st.done} done`)))),
    h('div', { class: 'cover-body' },
      h('section', { class: 'cover-outcomes' }, h('h2', { class: 'label' }, 'By the end you can'), h('ul', null, ch.outcomes.map((o) => h('li', null, icon('check', 16), o)))),
      h('section', { class: 'cover-pages' }, h('h2', { class: 'label' }, 'Pages'), h('ol', { class: 'ch-list' }, rows))));
  shell.stage.replaceChildren(h('div', { class: 'scroll' }, view));
  return {};
}
