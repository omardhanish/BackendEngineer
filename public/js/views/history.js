// Saved chats: search every conversation, read it back, export to Markdown.
import { h, icon, applyHue, relTime, debounce, pad2 } from '../ui.js';
import { api } from '../api.js';
import { state, topicMeta, chapterOf } from '../state.js';
import { shell } from '../shell.js';
import { renderMarkdown } from '../markdown.js';
import { copyText, toast } from '../ui.js';

export function historyView(query) {
  applyHue(250);
  shell.setCrumbs([{ label: 'Bookshelf', href: '/' }, { label: 'Saved chats' }]);
  let sel = { topic: query.get('topic') || '', thread: query.get('thread') || '' };
  let rows = [];

  const search = h('input', { type: 'search', class: 'hist-search', placeholder: 'Search every saved chat…', 'aria-label': 'Search saved chats', autocomplete: 'off', value: query.get('q') || '' });
  const list = h('ul', { class: 'hist-list' });
  const pane = h('section', { class: 'hist-pane', 'aria-live': 'polite' });
  const count = h('p', { class: 'hist-count' });

  async function load() {
    const q = search.value.trim();
    try { rows = (await api.searchChats(q)).threads; } catch (e) { rows = []; toast(e.message, { kind: 'error' }); }
    if (!sel.thread && rows[0]) sel = { topic: rows[0].topicId, thread: rows[0].threadId };
    paintList();
    await paintPane();
  }

  function paintList() {
    count.textContent = rows.length ? `${rows.length} conversation${rows.length === 1 ? '' : 's'}` : '';
    list.replaceChildren(...(rows.length ? rows.map((r) => {
      const meta = topicMeta(r.topicId);
      const ch = meta && chapterOf(meta.chapter);
      return h('li', null, h('button', { type: 'button', class: `hist-item${r.threadId === sel.thread ? ' is-active' : ''}`, style: { '--h': ch?.hue ?? 250 }, onclick: () => { sel = { topic: r.topicId, thread: r.threadId }; history.replaceState({}, '', `/chats?topic=${r.topicId}&thread=${r.threadId}`); paintList(); paintPane(); } },
        h('span', { class: 'hist-title' }, r.title),
        h('span', { class: 'hist-where' }, meta ? `${pad2(ch.n)} · ${meta.title}` : r.topicId),
        r.snippet ? h('span', { class: 'hist-snip' }, r.snippet) : null,
        h('span', { class: 'hist-when' }, `${r.kind === 'roleplay' ? 'Role-play · ' : ''}${relTime(r.updatedAt)} · ${r.messages} msg`)));
    }) : [h('li', { class: 'hist-empty' }, search.value ? 'No chats match that search.' : 'No chats yet. Open any page and ask the tutor something. It will be saved here.')]));
  }

  async function paintPane() {
    if (!sel.thread) {
      pane.replaceChildren(h('div', { class: 'hist-blank' }, icon('chat', 28), h('p', null, 'Pick a conversation to read it again.')));
      return;
    }
    let doc;
    try { doc = await api.chats(sel.topic); } catch { return; }
    const t = doc.threads.find((x) => x.id === sel.thread);
    if (!t) return;
    const meta = topicMeta(sel.topic);
    const body = h('div', { class: 'msgs' });
    for (const m of t.messages) {
      if (!m.content) continue;
      if (m.role === 'user') body.append(h('div', { class: 'msg msg-user' }, m.quote ? h('blockquote', { class: 'msg-quote' }, m.quote) : null, h('div', { class: 'msg-text' }, m.content)));
      else body.append(h('div', { class: 'msg msg-ai' }, h('div', { class: 'msg-md', html: renderMarkdown(m.content) }), m.status && m.status !== 'complete' ? h('span', { class: 'msg-flag' }, m.status) : null));
    }
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy]');
      if (b) copyText(b.closest('.md-code').querySelector('code').textContent).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1200); });
    });
    pane.replaceChildren(
      h('header', { class: 'hist-head' },
        h('div', null, h('h2', null, t.title), h('p', { class: 'muted' }, meta ? meta.title : sel.topic, ' · ', new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))),
        h('div', { class: 'hist-actions' },
          h('a', { class: 'btn', href: `/read/${sel.topic}` }, 'Open page', icon('arrow-right', 15)),
          h('a', { class: 'btn', href: `/api/chats/${sel.topic}/export?thread=${t.id}`, download: '' }, icon('download', 15), 'Export'),
          h('a', { class: 'btn btn-quiet', href: '/api/chats/export', download: '' }, 'Export all'))),
      body);
  }

  search.addEventListener('input', debounce(load, 220));
  shell.stage.replaceChildren(h('div', { class: 'history' },
    h('aside', { class: 'hist-side' }, h('div', { class: 'hist-tools' }, h('h1', null, 'Saved chats'), search, count), list),
    pane));
  load();
  return {};
}
