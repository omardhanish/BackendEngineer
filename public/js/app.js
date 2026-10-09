// App shell: contents, top bar, tutor dock, theme/motion, global shortcuts, routes.
import { api } from './api.js';
import { state, pref, chapterOf, topicMeta, rememberHue } from './state.js';
import { paths } from './paths.js';
import { flushProgress } from './progress.js';
import { h, $, icon, applyHue, isTyping, pad2 } from './ui.js';
import { route, fallback, onFailure, start, navigate, onRoute, currentView } from './router.js';
import { shell } from './shell.js';
import { createToc } from './toc.js';
import { createDock } from './chat.js';
import { createPalette } from './palette.js';
import { createHelp } from './help.js';
import { libraryView } from './views/library.js';
import { homeView } from './views/home.js';
import { chapterView } from './views/chapter.js';
import { topicView } from './views/topic.js';
import { historyView } from './views/history.js';

const appEl = $('#app');
const root = document.documentElement;
const wide = window.matchMedia('(min-width: 1284px)');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const THEMES = ['system', 'light', 'dark'];
let toc;
let dock;
let palette;
let help;
let themeBtn;
let dockBtn;
let crumbsEl;
let brandEl;

// ------------------------------------------------------------------ theme & motion
function applyTheme() {
  const p = pref('theme');
  root.dataset.theme = p === 'dark' || (p === 'system' && prefersDark.matches) ? 'dark' : 'light';
  if (!themeBtn) return;
  themeBtn.replaceChildren(icon(p === 'system' ? 'monitor' : p === 'dark' ? 'moon' : 'sun', 18));
  themeBtn.setAttribute('aria-label', `Theme: ${p}. Click to change.`);
  themeBtn.title = `Theme: ${p}`;
}
function cycleTheme() {
  pref('theme', THEMES[(THEMES.indexOf(pref('theme')) + 1) % THEMES.length]);
  applyTheme();
}
function applyMotion() {
  if (pref('motion') === 'reduce') root.dataset.motion = 'reduce';
  else delete root.dataset.motion;
}
prefersDark.addEventListener('change', applyTheme);

// ------------------------------------------------------------------ panels
function setToc(open) {
  appEl.dataset.toc = open ? 'open' : 'closed';
  if (open) toc.focusSearch();
}
function setDock(open, { focus = false, remember = true } = {}) {
  appEl.dataset.dock = open ? 'open' : 'closed';
  dock.el.inert = !open;
  dockBtn?.setAttribute('aria-pressed', String(open));
  if (remember && wide.matches) pref('dock', open ? 'open' : 'closed');
  if (open && focus) dock.focusComposer();
}
const dockOpen = () => appEl.dataset.dock === 'open';
function toggleDock(focus = true) { setDock(!dockOpen(), { focus }); }
function closeOverlays() {
  let closed = false;
  if (appEl.dataset.toc === 'open') { setToc(false); closed = true; }
  if (!wide.matches && dockOpen()) { setDock(false, { remember: false }); closed = true; }
  return closed;
}

// ------------------------------------------------------------------ top bar
function setCrumbs(all) {
  const parts = all[0]?.label === 'Library' ? all : [{ label: 'Library', href: paths.library() }, ...all];
  crumbsEl.replaceChildren(...parts.flatMap((p, i) => [
    i ? h('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '/') : null,
    p.href ? h('a', { class: 'crumb', href: p.href }, p.label) : h('span', { class: 'crumb is-here', 'aria-current': 'page' }, p.label),
  ]).filter(Boolean));
}

function buildTopbar() {
  crumbsEl = h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' });
  themeBtn = h('button', { class: 'btn-icon', type: 'button', onclick: cycleTheme });
  dockBtn = h('button', { class: 'btn-icon tb-dock', type: 'button', 'aria-label': 'Tutor and notes (C)', title: 'Tutor and notes (C)', 'aria-pressed': 'false', onclick: () => toggleDock(true) }, icon('chat', 18));
  const searchBtn = h('button', { class: 'tb-search', type: 'button', onclick: () => palette.open(), 'aria-label': 'Search (⌘K)' }, icon('search', 15), h('span', null, 'Search'), h('kbd', null, '⌘K'));
  const topbar = h('header', { class: 'topbar' },
    h('button', { class: 'btn-icon tb-menu', type: 'button', 'aria-label': 'Open contents', onclick: () => setToc(true) }, icon('menu', 18)),
    (brandEl = h('a', { class: 'tb-brand', href: '/', 'aria-label': 'Library' }, 'L')),
    crumbsEl,
    h('div', { class: 'tb-actions' }, searchBtn, h('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Shortcuts (?)', title: 'Shortcuts (?)', onclick: () => help.open() }, icon('help', 18)), themeBtn, dockBtn));
  shell.page = h('main', { class: 'page', id: 'page' }, (shell.stage = h('div', { id: 'stage', class: 'stage', tabindex: '-1' })));
  $('#main').append(topbar, shell.page);
}

// ------------------------------------------------------------------ "Ask about this" on text selection
function setupSelectionAsk() {
  const btn = h('button', { class: 'ask-sel', type: 'button', hidden: true }, icon('sparkle', 14), 'Ask about this');
  document.body.append(btn);
  let text = '';
  const hide = () => { btn.hidden = true; };
  document.addEventListener('mouseup', () => setTimeout(() => {
    const sel = window.getSelection();
    const t = sel?.toString().trim() || '';
    const anchor = sel?.anchorNode instanceof Element ? sel.anchorNode : sel?.anchorNode?.parentElement;
    if (!t || t.length < 3 || !anchor || !shell.stage.contains(anchor) || anchor.closest('textarea, input, .editor, .no-ask')) return hide();
    text = t.slice(0, 1200);
    const r = sel.getRangeAt(0).getBoundingClientRect();
    btn.hidden = false;
    btn.style.left = `${Math.min(window.innerWidth - 150, Math.max(8, r.left + r.width / 2 - 62))}px`;
    btn.style.top = `${Math.max(8, r.top - 40)}px`;
  }, 10));
  document.addEventListener('mousedown', (e) => { if (e.target !== btn && !btn.contains(e.target)) hide(); });
  btn.addEventListener('click', () => {
    hide();
    window.getSelection()?.removeAllRanges();
    setDock(true, { remember: false });
    dock.askAbout(text);
  });
}

// ------------------------------------------------------------------ keyboard
function setupKeys() {
  document.addEventListener('keydown', (e) => {
    if (e.isComposing || e.defaultPrevented) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open(); return; }
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { if (closeOverlays()) e.preventDefault(); return; }
    if (isTyping(e) || mod || e.altKey) return;
    if (currentView()?.keydown?.(e)) { e.preventDefault(); return; }
    if (e.key === '?') { e.preventDefault(); help.open(); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); setToc(appEl.dataset.toc !== 'open'); }
    else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); toggleDock(true); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setDock(true, { remember: false }); dock.showTab('notes', true); }
    else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); setToc(true); toc.openSwitcher(); }
  });
}

// ------------------------------------------------------------------ views that live in the shell
function notFoundView(what = 'That page is not in the library') {
  toc.showLibrary(); // there is no book to show chapters of: list the books instead
  applyHue(250);
  shell.setCrumbs([{ label: 'Library', href: '/' }, { label: 'Not found' }]);
  shell.stage.replaceChildren(h('div', { class: 'empty-state' }, h('h1', null, what), h('p', null, 'The link may be old, or the book may have been removed.'), h('a', { class: 'btn btn-primary', href: '/' }, 'Back to the library')));
  return {};
}

function errorView(e) {
  applyHue(250);
  shell.setCrumbs([{ label: 'Library', href: '/' }, { label: 'Error' }]);
  shell.stage.replaceChildren(h('div', { class: 'empty-state' }, h('h1', null, 'That page could not load'), h('p', { class: 'muted' }, e?.message || 'Unknown error'), h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Try again')));
  return {};
}

function fatal(e) {
  document.body.append(h('div', { class: 'fatal' }, h('h1', null, 'The book could not load'), h('p', null, e.message || 'Unknown error'), h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Try again')));
}

// ------------------------------------------------------------------ books
/** Make `slug` the current book: load its manifest and progress, rebuild the contents. False if there is no such book. */
async function ensureBook(slug, rc) {
  if (state.slug === slug && state.book) {
    if (toc.mode() !== 'book') toc.build();
    return true;
  }
  if (!state.library.some((b) => b.slug === slug)) {
    // a book may have been added while this tab was open: look again before giving up
    try {
      const lib = await api.library();
      state.library = lib.books; state.defaultSlug = lib.default;
    } catch { /* offline: fall through to not-found */ }
    if (!state.library.some((b) => b.slug === slug)) return false;
  }
  let book;
  let progress;
  try {
    [book, progress] = await Promise.all([api.book(slug), api.progress(slug).catch(() => null)]);
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
  if (rc?.stale()) return false;
  // leaving the previous book: save its notes and progress while "current book" still means that book
  if (state.slug) { dock.setTopic(null); flushProgress(); }
  state.slug = slug;
  state.book = book;
  state.progress = progress || { topics: {}, last: null };
  const meta = state.library.find((b) => b.slug === slug);
  if (meta) rememberHue(slug, meta.hue);
  toc.build();
  return true;
}

/** Route wrapper: the page belongs to a book, so that book must be loaded first. */
const inBook = (view) => async (p, q, rc) => {
  if (!(await ensureBook(p.book, rc))) return rc.stale() ? {} : notFoundView('No such book');
  if (rc.stale()) return {};
  return view(p, q, rc);
};

/** The original /c/…, /read/… and /chats URLs belong to the default book. */
const legacy = (to) => (p, q) => {
  const slug = state.defaultSlug || state.library[0]?.slug;
  if (!slug) return notFoundView();
  navigate(to(p, q, slug), { replace: true });
  return {};
};

function paintBrand() {
  const here = toc.mode() === 'book' ? state.library.find((b) => b.slug === state.slug) : null;
  brandEl.textContent = here?.monogram || 'L';
  brandEl.href = here ? paths.book() : paths.library();
  brandEl.setAttribute('aria-label', here ? here.title : 'Library');
}

// ------------------------------------------------------------------ boot
async function boot() {
  applyMotion();
  try {
    const [lib, health] = await Promise.all([api.library(), api.health().catch(() => null)]);
    state.library = lib.books;
    state.defaultSlug = lib.default;
    state.health = health;
    for (const b of lib.books) rememberHue(b.slug, b.hue);
  } catch (e) { return fatal(e); }

  toc = createToc({ onClose: () => setToc(false) });
  $('#toc').append(toc.el);
  shell.toc = toc;

  help = createHelp({
    onTheme: cycleTheme,
    onMotion: (on_) => { pref('motion', on_ ? 'reduce' : 'system'); applyMotion(); },
  });
  palette = createPalette({
    inLibrary: () => toc.mode() === 'library',
    actions: () => [
      { label: 'Go to the library', icon: 'home', run: () => navigate(paths.library()), keywords: 'home start books shelf' },
      { label: 'Switch book', icon: 'book', hint: 'B', run: () => { setToc(true); toc.openSwitcher(); }, keywords: 'change library books' },
      ...(toc.mode() === 'book' ? [
        { label: 'Go to this book’s chapters', icon: 'book', run: () => navigate(paths.book()), keywords: 'contents bookshelf' },
        { label: 'Saved chats', icon: 'history', run: () => navigate(paths.chats()), keywords: 'history conversations' },
        { label: 'Ask the tutor', icon: 'chat', hint: 'C', run: () => setDock(true, { focus: true }) },
        { label: 'My notes for this page', icon: 'note', hint: 'N', run: () => { setDock(true); dock.showTab('notes', true); } },
      ] : []),
      { label: 'Change theme', icon: 'sun', run: cycleTheme, keywords: 'dark light' },
      { label: 'Keyboard shortcuts', icon: 'help', hint: '?', run: () => help.open() },
    ],
  });

  buildTopbar();
  dock = createDock({ getLive: () => shell.getLive?.() ?? null });
  $('#dock').append(dock.el);
  shell.dock = dock;
  shell.setCrumbs = setCrumbs;
  shell.setDock = setDock;
  shell.toggleDock = toggleDock;
  shell.focusStage = () => shell.stage.focus({ preventScroll: true });
  shell.openNotes = () => { setDock(true, { remember: false }); dock.showTab('notes', true); };

  applyTheme();
  const stored = pref('dock');
  setDock(wide.matches ? stored !== 'closed' : false, { remember: false });
  appEl.dataset.toc = 'closed';
  $('#scrim').addEventListener('click', closeOverlays);
  wide.addEventListener('change', () => setDock(wide.matches ? pref('dock') !== 'closed' : false, { remember: false }));
  setupKeys();
  setupSelectionAsk();

  route('/', (p, q, rc) => { toc.showLibrary(); return libraryView(rc); });
  route('/b/:book', inBook(() => homeView()));
  route('/b/:book/c/:ch', inBook((p) => chapterView(p.ch)));
  route('/b/:book/read/:id/:frame?', inBook((p, q, rc) => topicView(p.id, p.frame, rc)));
  route('/b/:book/chats', inBook((p, q) => historyView(q)));
  route('/c/:ch', legacy((p, q, slug) => paths.chapter(p.ch, slug)));
  route('/read/:id/:frame?', legacy((p, q, slug) => paths.read(p.id, p.frame, slug)));
  route('/chats', legacy((p, q, slug) => paths.chats(q.toString(), slug)));
  fallback(() => notFoundView());
  onFailure(errorView);

  onRoute(({ path }) => {
    appEl.dataset.toc = 'closed';
    if (!wide.matches) setDock(false, { remember: false });
    toc.closeSwitcher();
    const book = /^\/b\/[^/]+/.test(path);
    const m = /^\/b\/[^/]+\/read\/(c\d\d-[a-z0-9]+)/.exec(path);
    const c = /^\/b\/[^/]+\/c\/(c\d\d)/.exec(path);
    const loaded = toc.mode() === 'book' && !!state.book;
    const topic = m && loaded ? topicMeta(m[1]) : null;
    toc.setCurrent({ topicId: topic?.id ?? null, chapterId: topic?.chapter ?? c?.[1] ?? null });
    const ch = topic ? chapterOf(topic.chapter) : c && loaded ? chapterOf(c[1]) : null;
    const title = book && loaded ? state.book.book?.title || state.slug : null;
    document.title = topic ? `${topic.title} · ${title}` : ch ? `${ch.title} · ${title}` : title ? `${title} · Living library` : 'Living library';
    if (!m) dock.setTopic(null);
    paintBrand();
    window.scrollTo(0, 0);
  });

  await start();
}

boot();
