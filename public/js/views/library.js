// The library: every book as a cover. Pick one to read, or continue where you left off.
import { h, icon, applyHue, copyText, toast } from '../ui.js';
import { api } from '../api.js';
import { state, rememberHue } from '../state.js';
import { paths } from '../paths.js';
import { shell } from '../shell.js';

const PROFILE = { js: 'JavaScript', python: 'Python', java: 'Java', c: 'C', none: 'Concepts', mixed: 'Mixed' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function cover(b) {
  const pct = b.pages ? Math.round((100 * b.done) / b.pages) : 0;
  const resume = b.last ? paths.read(b.last.id, b.last.frame > 0 ? b.last.frame + 1 : undefined, b.slug) : null;
  const el = h('article', { class: 'lib-card', style: { '--h': b.hue }, dataset: { slug: b.slug } },
    h('span', { class: 'lib-spine', 'aria-hidden': 'true' }),
    h('div', { class: 'lib-top' }, h('span', { class: 'lib-mono', 'aria-hidden': 'true' }, b.monogram), PROFILE[b.profile] ? h('span', { class: 'lib-kind' }, PROFILE[b.profile]) : null),
    h('h2', { class: 'lib-title' }, h('a', { class: 'lib-main', href: paths.book(b.slug) }, b.title)),
    b.tagline ? h('p', { class: 'lib-tag' }, b.tagline) : null,
    h('div', { class: 'lib-meta' },
      h('span', null, plural(b.chapters, 'chapter')),
      h('span', null, plural(b.pages, 'page')),
      b.authored < b.pages ? h('span', null, b.authored ? `${b.authored} written` : 'coming soon') : h('span', { class: 'lib-full' }, 'all written')),
    h('div', { class: 'lib-bar', role: 'img', 'aria-label': `${pct}% of ${b.title} done` }, h('span', { style: { width: `${pct}%` } })),
    h('div', { class: 'lib-foot' },
      resume
        ? h('a', { class: 'lib-continue', href: resume }, h('span', null, 'Continue'), h('b', null, clip(b.last.title, 34)), icon('arrow-right', 15))
        : h('span', { class: 'lib-start' }, b.authored ? 'Not started yet' : 'Still being written'),
      h('span', { class: 'lib-pct' }, `${pct}%`)));
  const hh = ((b.hue % 360) + 360) % 360;
  if (hh >= 80 && hh <= 150) el.dataset.band = 'lime';
  return el;
}

function addCard() {
  const cmd = '/786createbook';
  return h('article', { class: 'lib-card lib-add' },
    h('div', { class: 'lib-top' }, h('span', { class: 'lib-mono', 'aria-hidden': 'true' }, icon('plus', 20))),
    h('h2', { class: 'lib-title' }, 'Add a book'),
    h('p', { class: 'lib-tag' }, 'Give Claude Code your topics and headings. It builds a new book right here, with its own chapters, progress and tutor.'),
    h('div', { class: 'lib-cmd' },
      h('code', null, cmd),
      h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: async () => { if (await copyText(cmd)) toast('Copied. Paste it into Claude Code, then list your topics.'); } }, icon('copy', 13), 'Copy')));
}

export async function libraryView(rc) {
  applyHue(250);
  shell.setCrumbs([{ label: 'Library' }]);
  const root = h('div', { class: 'home lib' });
  shell.stage.replaceChildren(h('div', { class: 'scroll' }, root));

  function paint() {
    const books = state.library;
    const done = books.reduce((n, b) => n + b.done, 0);
    const written = books.reduce((n, b) => n + b.authored, 0);
    const recent = [...books].filter((b) => b.last).sort((a, b) => b.last.ts - a.last.ts)[0];
    const cta = recent
      ? h('a', { class: 'continue', href: paths.read(recent.last.id, recent.last.frame > 0 ? recent.last.frame + 1 : undefined, recent.slug), style: { '--h': recent.hue } },
        h('span', { class: 'continue-eyebrow' }, 'Continue reading'),
        h('span', { class: 'continue-title' }, recent.last.title),
        h('span', { class: 'continue-meta' }, recent.title),
        h('span', { class: 'continue-go', 'aria-hidden': 'true' }, icon('arrow-right', 20)))
      : null;
    root.replaceChildren(
      h('header', { class: 'home-hero' },
        h('div', { class: 'home-copy' },
          h('p', { class: 'eyebrow' }, 'Your library'),
          h('h1', { class: 'home-title' }, 'Pick a ', h('em', null, 'book')),
          h('p', { class: 'home-lede' }, 'Short, crisp pages you can read, run and watch, with a tutor on every page that already knows what you are looking at.'),
          cta ? h('div', { class: 'home-cta' }, cta) : null),
        h('div', { class: 'home-stats', role: 'group', 'aria-label': 'Your library in numbers' },
          h('div', { class: 'stat' }, h('b', null, books.length), h('span', null, books.length === 1 ? 'book' : 'books')),
          h('div', { class: 'stat' }, h('b', null, done), h('span', null, 'pages done')),
          h('div', { class: 'stat' }, h('b', null, written), h('span', null, 'pages written')))),
      h('section', { class: 'lib-shelf', 'aria-label': 'Books' }, [...books.map(cover), addCard()]),
      h('footer', { class: 'home-foot' }, 'Press ', h('kbd', null, '?'), ' for shortcuts · your progress, notes and chats are saved on this computer, separately for each book.'));
  }

  if (state.library.length) paint();
  try {
    const lib = await api.library();
    if (rc?.stale()) return {};
    state.library = lib.books;
    state.defaultSlug = lib.default;
    for (const b of lib.books) rememberHue(b.slug, b.hue);
  } catch (e) {
    if (!state.library.length) root.replaceChildren(h('div', { class: 'empty-state' }, h('h1', null, 'The library could not load'), h('p', { class: 'muted' }, e.message)));
    return {};
  }
  paint();
  shell.toc?.paintBooks?.();
  return {};
}
