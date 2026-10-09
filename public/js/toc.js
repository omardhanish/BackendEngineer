// Contents: full tree (wide screens / overlay) + slim chapter rail. Both are kept in sync with progress and the current page.
// It shows the chapters of the CURRENT book, or (on the library page) the list of books. A switcher at the top changes book.
import { h, s, icon, pad2 } from './ui.js';
import { state, on, bookPref, chapterStats, isDone, isVisited, topicsOf } from './state.js';
import { paths } from './paths.js';
import { createBookSwitcher } from './bookswitch.js';

const KIND_BADGE = { roleplay: ['RP', 'Role-play'], challenge: ['★', 'Challenge'], bonus: ['+', 'Bonus'] };

function ring(done, total, size = 36) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const f = total ? done / total : 0;
  return s('svg', { class: 'ring', width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' },
    s('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-bg' }),
    s('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-fg', 'stroke-dasharray': `${(c * f).toFixed(1)} ${c.toFixed(1)}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }));
}

const band = (el, hue) => {
  const hh = ((hue % 360) + 360) % 360;
  if (hh >= 80 && hh <= 150) el.dataset.band = 'lime';
};

export function createToc({ onClose }) {
  const root = h('div', { class: 'toc-inner', dataset: { mode: 'book' } });
  let openMap = {};
  let mode = 'book';
  let currentTopic = null;
  let currentChapter = null;
  let query = '';
  const refs = { chapters: new Map(), links: new Map(), rail: new Map(), counts: new Map(), statuses: new Map() };
  const switcher = createBookSwitcher();

  const search = h('input', { type: 'search', placeholder: 'Filter pages…', 'aria-label': 'Filter pages', autocomplete: 'off', spellcheck: 'false', oninput: (e) => { query = e.target.value.trim().toLowerCase(); applyFilter(); } });
  const chatsLink = h('a', { href: '/', class: 'toc-foot-link toc-chats' }, icon('history', 15), 'Saved chats');

  const full = h('nav', { class: 'toc-full', 'aria-label': 'Contents' },
    h('div', { class: 'toc-head' },
      switcher.el,
      h('button', { class: 'btn-icon toc-close', type: 'button', 'aria-label': 'Close contents', onclick: onClose }, icon('x', 18))),
    h('div', { class: 'toc-search' }, icon('search', 15), search),
    h('div', { class: 'toc-scroll' }),
    h('div', { class: 'toc-foot' }, chatsLink, h('a', { href: paths.library(), class: 'toc-foot-link' }, icon('home', 15), 'Library')));

  const railBrand = h('a', { class: 'rail-brand', href: paths.library(), 'aria-label': 'Library' }, 'L');
  const rail = h('nav', { class: 'toc-rail', 'aria-label': 'Chapters' }, railBrand, h('div', { class: 'rail-list' }));

  const scroll = full.querySelector('.toc-scroll');
  const railList = rail.querySelector('.rail-list');

  function clear() {
    scroll.replaceChildren();
    railList.replaceChildren();
    refs.chapters.clear(); refs.links.clear(); refs.rail.clear(); refs.counts.clear(); refs.statuses.clear();
  }

  /** The chapters and pages of the current book. */
  function build() {
    mode = 'book';
    root.dataset.mode = 'book';
    clear();
    query = ''; search.value = '';
    openMap = (() => { try { return JSON.parse(bookPref('tocOpen') || '{}'); } catch { return {}; } })();
    switcher.paint();
    railBrand.textContent = state.book.book?.monogram || 'B';
    railBrand.href = paths.library();
    chatsLink.href = paths.chats();
    for (const ch of state.book.chapters) {
      const st = chapterStats(ch.id);
      const count = h('span', { class: 'toc-ch-prog' }, `${st.done}/${st.total}`);
      refs.counts.set(ch.id, count);
      const list = h('ol', { class: 'toc-topics' });
      for (const t of topicsOf(ch.id)) {
        const status = h('span', { class: 'toc-status', 'aria-hidden': 'true' });
        refs.statuses.set(t.id, status);
        const badge = KIND_BADGE[t.kind];
        const a = h('a', { class: `toc-link${t.authored ? '' : ' is-soon'}`, href: paths.read(t.id), dataset: { id: t.id } },
          status, h('span', { class: 'toc-n' }, pad2(t.n)), h('span', { class: 'toc-title' }, t.title),
          badge ? h('span', { class: `badge badge-${t.kind}`, title: badge[1] }, badge[0]) : null);
        refs.links.set(t.id, a);
        list.append(h('li', null, a));
      }
      const isOpen = openMap[ch.id] ?? ch.n === 1;
      const head = h('button', { class: 'toc-ch-head', type: 'button', 'aria-expanded': String(isOpen), onclick: () => toggle(ch.id) },
        h('span', { class: 'toc-num' }, pad2(ch.n)), h('span', { class: 'toc-ch-title' }, ch.title), count, icon('chevron-down', 16, 'toc-caret'));
      const sec = h('section', { class: 'toc-ch', dataset: { ch: ch.id, open: String(isOpen) }, style: { '--h': ch.hue } }, head, list);
      band(sec, ch.hue);
      refs.chapters.set(ch.id, sec);
      scroll.append(sec);

      const rb = h('a', { class: 'rail-ch', href: paths.chapter(ch.id), title: `${pad2(ch.n)} · ${ch.title}`, 'aria-label': `Chapter ${ch.n}: ${ch.title}`, style: { '--h': ch.hue } }, ring(st.done, st.total), h('span', { class: 'rail-num' }, pad2(ch.n)));
      band(rb, ch.hue);
      refs.rail.set(ch.id, rb);
      railList.append(rb);
    }
    paintCurrent();
    applyFilter();
  }

  /** On the library page the contents is simply the list of books. */
  function showLibrary() {
    mode = 'library';
    root.dataset.mode = 'library';
    paintBooks();
  }

  function paintBooks() {
    switcher.paint({ library: mode === 'library' });
    if (mode !== 'library') return;
    clear();
    railBrand.textContent = 'L';
    const list = h('div', { class: 'toc-books' });
    for (const b of state.library) {
      const pct = b.pages ? Math.round((100 * b.done) / b.pages) : 0;
      const a = h('a', { class: 'toc-book', href: paths.book(b.slug), style: { '--h': b.hue } }, h('span', { class: 'bk-mono', 'aria-hidden': 'true' }, b.monogram), h('span', { class: 'bk-title' }, b.title), h('span', { class: 'bk-pct' }, `${pct}%`));
      band(a, b.hue);
      list.append(a);
      const rb = h('a', { class: 'rail-ch', href: paths.book(b.slug), title: b.title, 'aria-label': b.title, style: { '--h': b.hue } }, ring(b.done, b.pages), h('span', { class: 'rail-num' }, b.monogram));
      band(rb, b.hue);
      railList.append(rb);
    }
    scroll.append(list);
  }

  function toggle(chId, force) {
    const sec = refs.chapters.get(chId);
    if (!sec) return;
    const open = force ?? sec.dataset.open !== 'true';
    sec.dataset.open = String(open);
    sec.querySelector('.toc-ch-head').setAttribute('aria-expanded', String(open));
    openMap[chId] = open;
    bookPref('tocOpen', JSON.stringify(openMap));
  }

  function applyFilter() {
    if (mode !== 'book') return;
    for (const ch of state.book.chapters) {
      const sec = refs.chapters.get(ch.id);
      let any = false;
      for (const t of topicsOf(ch.id)) {
        const hit = !query || `${t.title} ${t.id} ${ch.title}`.toLowerCase().includes(query);
        refs.links.get(t.id).parentElement.hidden = !hit;
        any ||= hit;
      }
      sec.hidden = !any;
      if (query) sec.dataset.open = 'true';
      else sec.dataset.open = String(openMap[ch.id] ?? ch.n === 1);
    }
  }

  function paintStatus() {
    if (mode !== 'book') return;
    for (const t of state.book.topics) {
      const el = refs.statuses.get(t.id);
      if (!el) continue;
      el.className = `toc-status ${isDone(t.id) ? 'is-done' : isVisited(t.id) ? 'is-seen' : ''}`;
      el.replaceChildren(isDone(t.id) ? icon('check', 11) : '');
    }
    for (const ch of state.book.chapters) {
      const st = chapterStats(ch.id);
      refs.counts.get(ch.id).textContent = `${st.done}/${st.total}`;
      const rb = refs.rail.get(ch.id);
      rb.querySelector('.ring')?.replaceWith(ring(st.done, st.total));
    }
  }

  function paintCurrent() {
    if (mode !== 'book') return;
    for (const [id, a] of refs.links) {
      if (id === currentTopic) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    for (const [id, a] of refs.rail) {
      if (id === currentChapter) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    if (currentChapter && !query) toggle(currentChapter, true);
    refs.links.get(currentTopic)?.scrollIntoView({ block: 'nearest' });
    paintStatus();
  }

  function setCurrent({ topicId = null, chapterId = null }) {
    currentTopic = topicId;
    currentChapter = chapterId;
    if (mode === 'book' && state.book) paintCurrent();
  }

  on('progress', paintStatus);
  root.append(full, rail);
  return { el: root, build, showLibrary, paintBooks, setCurrent, mode: () => mode, focusSearch: () => search.focus(), openSwitcher: () => switcher.open(), closeSwitcher: () => switcher.close(), full, rail };
}
