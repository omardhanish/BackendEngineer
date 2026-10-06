// Bookshelf: one "book" per chapter, a continue-reading card, overall progress.
import { h, icon, pad2, applyHue } from '../ui.js';
import { state, chapterStats, overallStats, topicMeta, chapterOf } from '../state.js';
import { shell } from '../shell.js';

function bookCard(c) {
  const st = chapterStats(c.id);
  const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
  const el = h('a', { class: `book-card${st.written ? '' : ' is-soon'}`, href: `/c/${c.id}`, style: { '--h': c.hue }, 'aria-label': `Chapter ${c.n}: ${c.title}. ${st.total} pages, ${st.done} done.` },
    h('span', { class: 'book-spine', 'aria-hidden': 'true' }),
    h('span', { class: 'book-num', 'aria-hidden': 'true' }, pad2(c.n)),
    h('h3', { class: 'book-title' }, c.title),
    h('p', { class: 'book-tag' }, c.tagline),
    h('div', { class: 'book-meta' },
      h('span', null, `${st.total} page${st.total === 1 ? '' : 's'}`),
      st.written < st.total ? h('span', { class: 'book-written' }, st.written ? `${st.written} written` : 'coming soon') : h('span', { class: 'book-written is-full' }, 'all written'),
      st.done ? h('span', { class: 'book-done' }, `${st.done} done`) : null),
    h('span', { class: 'book-bar', 'aria-hidden': 'true' }, h('span', { style: { width: `${pct}%` } })));
  const hh = ((c.hue % 360) + 360) % 360;
  if (hh >= 80 && hh <= 150) el.dataset.band = 'lime';
  return el;
}

export function homeView() {
  applyHue(250);
  shell.setCrumbs([{ label: 'Bookshelf' }]);
  const all = overallStats();
  const last = state.progress.last;
  const lastMeta = last && topicMeta(last.id);
  const lastCh = lastMeta && chapterOf(lastMeta.chapter);
  const firstWritten = state.book.topics.find((t) => t.authored);

  const cta = lastMeta
    ? h('a', { class: 'continue', href: `/read/${lastMeta.id}`, style: { '--h': lastCh.hue } },
      h('span', { class: 'continue-eyebrow' }, 'Continue reading'),
      h('span', { class: 'continue-title' }, lastMeta.title),
      h('span', { class: 'continue-meta' }, `${pad2(lastCh.n)} · ${lastCh.title}`),
      h('span', { class: 'continue-go', 'aria-hidden': 'true' }, icon('arrow-right', 20)))
    : firstWritten
      ? h('a', { class: 'btn btn-primary btn-lg', href: `/read/${firstWritten.id}` }, 'Start reading', icon('arrow-right', 18))
      : null;

  const pct = all.total ? Math.round((all.done / all.total) * 100) : 0;
  const view = h('div', { class: 'home' },
    h('header', { class: 'home-hero' },
      h('div', { class: 'home-copy' },
        h('p', { class: 'eyebrow' }, 'A living book'),
        h('h1', { class: 'home-title' }, 'Backend ', h('em', null, 'Engineer')),
        h('p', { class: 'home-lede' }, 'From JavaScript to production. Short, crisp pages you can read, run and watch, with a tutor on every page that already knows what you are looking at.'),
        h('div', { class: 'home-cta' }, cta,
          h('button', { class: 'btn', type: 'button', onclick: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })) }, icon('search', 16), 'Search the book', h('kbd', null, '⌘K')))),
      h('div', { class: 'home-stats', role: 'group', 'aria-label': 'Your progress' },
        h('div', { class: 'stat' }, h('b', null, all.done), h('span', null, 'pages done')),
        h('div', { class: 'stat' }, h('b', null, all.written), h('span', null, `of ${all.total} written`)),
        h('div', { class: 'stat' }, h('b', null, `${pct}%`), h('span', null, 'of the book')))),
    h('section', { class: 'shelf', 'aria-label': 'Chapters' }, state.book.chapters.map(bookCard)),
    h('footer', { class: 'home-foot' }, 'Press ', h('kbd', null, '?'), ' for shortcuts · your progress, notes and chats are saved on this computer.'));
  shell.stage.replaceChildren(h('div', { class: 'scroll' }, view));
  return {};
}
