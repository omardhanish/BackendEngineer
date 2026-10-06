// Contents: full tree (wide screens / overlay) + slim chapter rail. Both are kept in sync with progress and the current page.
import { h, s, icon, pad2, applyHue } from './ui.js';
import { state, on, pref, chapterStats, isDone, isVisited, topicsOf } from './state.js';

const KIND_BADGE = { roleplay: ['RP', 'Role-play'], challenge: ['★', 'Challenge'], bonus: ['+', 'Bonus'] };

function ring(done, total, size = 36) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const f = total ? done / total : 0;
  return s('svg', { class: 'ring', width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' },
    s('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-bg' }),
    s('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-fg', 'stroke-dasharray': `${(c * f).toFixed(1)} ${c.toFixed(1)}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }));
}

export function createToc({ onClose }) {
  const root = h('div', { class: 'toc-inner' });
  const openMap = (() => { try { return JSON.parse(pref('tocOpen') || '{}'); } catch { return {}; } })();
  let currentTopic = null;
  let currentChapter = null;
  let query = '';
  const refs = { chapters: new Map(), links: new Map(), rail: new Map(), counts: new Map(), statuses: new Map() };

  const search = h('input', { type: 'search', placeholder: 'Filter pages…', 'aria-label': 'Filter pages', autocomplete: 'off', spellcheck: 'false', oninput: (e) => { query = e.target.value.trim().toLowerCase(); applyFilter(); } });

  const full = h('nav', { class: 'toc-full', 'aria-label': 'Contents' },
    h('div', { class: 'toc-head' },
      h('a', { class: 'brand', href: '/' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'BE'), h('span', { class: 'brand-name' }, 'Backend', h('em', null, 'Engineer'))),
      h('button', { class: 'btn-icon toc-close', type: 'button', 'aria-label': 'Close contents', onclick: onClose }, icon('x', 18))),
    h('div', { class: 'toc-search' }, icon('search', 15), search),
    h('div', { class: 'toc-scroll' }),
    h('div', { class: 'toc-foot' },
      h('a', { href: '/chats', class: 'toc-foot-link' }, icon('history', 15), 'Saved chats'),
      h('a', { href: '/', class: 'toc-foot-link' }, icon('home', 15), 'Bookshelf')));

  const rail = h('nav', { class: 'toc-rail', 'aria-label': 'Chapters' },
    h('a', { class: 'rail-brand', href: '/', 'aria-label': 'Bookshelf' }, 'BE'),
    h('div', { class: 'rail-list' }));

  const scroll = full.querySelector('.toc-scroll');
  const railList = rail.querySelector('.rail-list');

  function build() {
    scroll.replaceChildren();
    railList.replaceChildren();
    refs.chapters.clear(); refs.links.clear(); refs.rail.clear(); refs.counts.clear(); refs.statuses.clear();
    for (const ch of state.book.chapters) {
      const st = chapterStats(ch.id);
      const count = h('span', { class: 'toc-ch-prog' }, `${st.done}/${st.total}`);
      refs.counts.set(ch.id, count);
      const list = h('ol', { class: 'toc-topics' });
      for (const t of topicsOf(ch.id)) {
        const status = h('span', { class: 'toc-status', 'aria-hidden': 'true' });
        refs.statuses.set(t.id, status);
        const badge = KIND_BADGE[t.kind];
        const a = h('a', { class: `toc-link${t.authored ? '' : ' is-soon'}`, href: `/read/${t.id}`, dataset: { id: t.id } },
          status, h('span', { class: 'toc-n' }, pad2(t.n)), h('span', { class: 'toc-title' }, t.title),
          badge ? h('span', { class: `badge badge-${t.kind}`, title: badge[1] }, badge[0]) : null);
        refs.links.set(t.id, a);
        list.append(h('li', null, a));
      }
      const isOpen = openMap[ch.id] ?? ch.n === 1;
      const head = h('button', { class: 'toc-ch-head', type: 'button', 'aria-expanded': String(isOpen), onclick: () => toggle(ch.id) },
        h('span', { class: 'toc-num' }, pad2(ch.n)), h('span', { class: 'toc-ch-title' }, ch.title), count, icon('chevron-down', 16, 'toc-caret'));
      const sec = h('section', { class: 'toc-ch', dataset: { ch: ch.id, open: String(isOpen) }, style: { '--h': ch.hue } }, head, list);
      applyBand(sec, ch.hue);
      refs.chapters.set(ch.id, sec);
      scroll.append(sec);

      const rb = h('a', { class: 'rail-ch', href: `/c/${ch.id}`, title: `${pad2(ch.n)} · ${ch.title}`, 'aria-label': `Chapter ${ch.n}: ${ch.title}`, style: { '--h': ch.hue } }, ring(st.done, st.total), h('span', { class: 'rail-num' }, pad2(ch.n)));
      applyBand(rb, ch.hue);
      refs.rail.set(ch.id, rb);
      railList.append(rb);
    }
    paintCurrent();
    applyFilter();
  }

  function applyBand(el, hue) {
    const hh = ((hue % 360) + 360) % 360;
    if (hh >= 80 && hh <= 150) el.dataset.band = 'lime';
  }

  function toggle(chId, force) {
    const sec = refs.chapters.get(chId);
    const open = force ?? sec.dataset.open !== 'true';
    sec.dataset.open = String(open);
    sec.querySelector('.toc-ch-head').setAttribute('aria-expanded', String(open));
    openMap[chId] = open;
    pref('tocOpen', JSON.stringify(openMap));
  }

  function applyFilter() {
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
    if (state.book) paintCurrent();
  }

  on('progress', paintStatus);
  root.append(full, rail);
  return { el: root, build, setCurrent, focusSearch: () => search.focus(), full, rail };
}
