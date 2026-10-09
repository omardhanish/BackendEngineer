// ⌘K command palette: jump to any page or chapter, run an action, or find a saved chat.
import { h, icon, pad2, debounce, relTime } from './ui.js';
import { state } from './state.js';
import { api } from './api.js';
import { navigate } from './router.js';
import { paths } from './paths.js';

function score(query, hay) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const low = hay.toLowerCase();
  let total = 0;
  for (const t of tokens) {
    const i = low.indexOf(t);
    if (i === -1) return -1;
    total += i === 0 ? 6 : /[\s\-_/]/.test(low[i - 1]) ? 4 : 1;
  }
  return total - hay.length * 0.002;
}

export function createPalette({ actions, inLibrary = () => false }) {
  let items = [];
  let shown = [];
  let active = 0;
  let chatHits = [];
  let seq = 0;

  const input = h('input', { type: 'text', class: 'pal-input', placeholder: 'Search books, pages, chapters, saved chats…', 'aria-label': 'Search', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'pal-list', autocomplete: 'off', spellcheck: 'false' });
  const list = h('ul', { class: 'pal-list', id: 'pal-list', role: 'listbox' });
  const dlg = h('dialog', { class: 'palette', 'aria-label': 'Search' },
    h('div', { class: 'pal-top' }, icon('search', 18), input, h('kbd', null, 'esc')),
    list,
    h('div', { class: 'pal-foot' }, h('span', null, h('kbd', null, '↑'), h('kbd', null, '↓'), ' move'), h('span', null, h('kbd', null, '↵'), ' open'), h('span', null, h('kbd', null, 'esc'), ' close')));

  function collect() {
    const out = [];
    for (const a of actions()) out.push({ kind: 'action', label: a.label, sub: a.hint || 'Action', icon: a.icon, hay: `${a.label} ${a.keywords || ''}`, run: a.run });
    for (const b of state.library) {
      if (b.slug === state.slug && !inLibrary()) continue;
      out.push({ kind: 'book', label: b.title, sub: b.tagline || 'Book', hue: b.hue, icon: 'book', hay: `book ${b.title} ${b.tagline || ''} ${b.slug}`, run: () => navigate(paths.book(b.slug)) });
    }
    if (inLibrary() || !state.book) return out;
    for (const c of state.book.chapters) {
      out.push({ kind: 'chapter', label: `${pad2(c.n)} · ${c.title}`, sub: c.tagline, hue: c.hue, icon: 'book', hay: `chapter ${c.n} ${c.title} ${c.tagline}`, run: () => navigate(paths.chapter(c.id)) });
    }
    const ch = new Map(state.book.chapters.map((c) => [c.id, c]));
    for (const t of state.book.topics) {
      const c = ch.get(t.chapter);
      out.push({ kind: 'page', label: t.title, sub: `${pad2(c.n)} ${c.title}${t.authored ? '' : ' · soon'}`, hue: c.hue, icon: 'dot', hay: `${t.title} ${c.title} ${t.id}`, run: () => navigate(paths.read(t.id)) });
    }
    return out;
  }

  function render() {
    const q = input.value.trim();
    shown = (q ? items.map((it) => ({ it, sc: score(q, it.hay) })).filter((x) => x.sc >= 0).sort((a, b) => b.sc - a.sc).map((x) => x.it)
      : items.filter((i) => i.kind === 'action' || i.kind === 'chapter' || i.kind === 'book')).slice(0, 40);
    shown = shown.concat(chatHits.slice(0, 5));
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren(...(shown.length ? shown.map((it, i) => h('li', {
      class: `pal-item${i === active ? ' is-active' : ''}`, role: 'option', 'aria-selected': String(i === active), id: `pal-${i}`,
      style: it.hue != null ? { '--h': it.hue } : null, onclick: () => choose(i), onmousemove: () => setActive(i, false),
    }, h('span', { class: `pal-ico pal-${it.kind}` }, icon(it.icon || 'dot', 16)), h('span', { class: 'pal-label' }, it.label), h('span', { class: 'pal-sub' }, it.sub))) : [h('li', { class: 'pal-empty' }, 'Nothing matches. Try fewer words.')]));
    input.setAttribute('aria-activedescendant', shown.length ? `pal-${active}` : '');
  }

  function setActive(i, scroll = true) {
    active = (i + shown.length) % Math.max(1, shown.length);
    list.querySelectorAll('.pal-item').forEach((el, j) => { el.classList.toggle('is-active', j === active); el.setAttribute('aria-selected', String(j === active)); });
    if (scroll) list.children[active]?.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', `pal-${active}`);
  }

  function choose(i) {
    const it = shown[i];
    if (!it) return;
    close();
    queueMicrotask(it.run);
  }

  const searchChats = debounce(async () => {
    const q = input.value.trim();
    const my = ++seq;
    if (q.length < 3 || inLibrary() || !state.slug) { chatHits = []; render(); return; }
    try {
      const { threads } = await api.searchChats(q);
      if (my !== seq) return;
      chatHits = threads.map((t) => ({
        kind: 'chat', label: t.title, sub: `Saved chat · ${relTime(t.updatedAt)}`, icon: 'chat', hay: '',
        run: () => navigate(paths.chats(`topic=${t.topicId}&thread=${t.threadId}`)),
      }));
      render();
    } catch { /* offline: ignore */ }
  }, 250);

  input.addEventListener('input', () => { active = 0; render(); searchChats(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });

  function open(prefill = '') {
    items = collect();
    chatHits = [];
    input.value = prefill;
    active = 0;
    render();
    if (!dlg.open) dlg.showModal();
    input.focus();
    input.select();
  }
  function close() { if (dlg.open) dlg.close(); }

  document.body.append(dlg);
  return { open, close, el: dlg };
}
