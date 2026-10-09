// The book switcher at the top of the contents: shows the current book and opens a menu of every book.
import { h, icon } from './ui.js';
import { api } from './api.js';
import { state, rememberHue } from './state.js';
import { paths } from './paths.js';

export function createBookSwitcher() {
  const mono = h('span', { class: 'bk-mono', 'aria-hidden': 'true' });
  const name = h('span', { class: 'bk-name' });
  const btn = h('button', { class: 'bk-btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'Switch book', onclick: () => (menu.hidden ? open() : close()) }, mono, name, icon('chevron-down', 15, 'bk-caret'));
  const menu = h('div', { class: 'bk-menu', role: 'menu', 'aria-label': 'Books', hidden: true });
  const el = h('div', { class: 'bk-switch' }, btn, menu);

  const current = () => state.library.find((b) => b.slug === state.slug) || (state.book?.book ? { ...state.book.book } : null);

  function paint({ library = false } = {}) {
    const cur = state.slug && !library ? current() : null;
    mono.textContent = cur?.monogram || 'L';
    name.textContent = cur?.title || 'Library';
    menu.replaceChildren(
      ...state.library.map((b) => {
        const pct = b.pages ? Math.round((100 * b.done) / b.pages) : 0;
        const here = b.slug === state.slug && !library;
        const a = h('a', { class: `bk-item${here ? ' is-current' : ''}`, role: 'menuitem', href: paths.book(b.slug), style: { '--h': b.hue }, onclick: close },
          h('span', { class: 'bk-mono', 'aria-hidden': 'true' }, b.monogram), h('span', { class: 'bk-title' }, b.title), h('span', { class: 'bk-pct' }, `${pct}%`));
        if (here) a.setAttribute('aria-current', 'true');
        return a;
      }),
      h('a', { class: 'bk-all', role: 'menuitem', href: paths.library(), onclick: close }, icon('book', 15), 'All books'));
  }

  async function open() {
    paint();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('[aria-current], .bk-item')?.focus();
    // progress moves while you read: refresh the percentages each time the menu opens
    try {
      const lib = await api.library();
      state.library = lib.books;
      state.defaultSlug = lib.default;
      for (const b of lib.books) rememberHue(b.slug, b.hue);
      if (!menu.hidden) paint();
    } catch { /* offline: keep what we have */ }
  }
  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', (e) => { if (!el.contains(e.target)) close(); });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); close(); btn.focus(); return; }
    if (menu.hidden || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const items = [...menu.querySelectorAll('a')];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  });

  return { el, paint, close, open };
}
