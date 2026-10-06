// The tutor dock: a DeepSeek chat that already knows the page, with saved threads, role-play mode and notes.
// The server builds the prompt and owns history; this file only streams, renders and keeps the UI honest.
import { h, icon, uid, relTime, debounce, copyText, toast } from './ui.js';
import { api, streamChat } from './api.js';
import { renderMarkdown } from './markdown.js';
import { state } from './state.js';
import { shell } from './shell.js';

const DEFAULT_STARTERS = ['Explain this more simply', 'Give me a real-world example', 'What mistakes do beginners make here?', 'Quiz me on this page', 'How would I use this in a real project?'];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Esc in the dock: back to the page. When the dock is a slide-over or sheet (narrow screens) it closes too. */
function leaveDock() {
  if (!window.matchMedia('(min-width: 1284px)').matches) shell.setDock(false, { remember: false });
  shell.focusStage();
}

// ------------------------------------------------------------------ notes
function createNotes() {
  const ta = h('textarea', { class: 'notes-ta', placeholder: 'Your notes for this page. Saved on this computer as you type.', 'aria-label': 'Notes for this page', spellcheck: 'true' });
  const status = h('span', { class: 'notes-status' }, '');
  const el = h('div', { class: 'notes' }, ta, h('div', { class: 'notes-foot' }, status, h('span', { class: 'muted' }, 'Markdown is fine.')));
  let topicId = null;
  let rev = 0;
  let dirty = false;

  const save = debounce(async () => {
    if (!topicId || !dirty) return;
    const id = topicId;
    status.textContent = 'Saving…';
    try {
      const r = await api.saveNotes(id, ta.value, rev);
      if (id !== topicId) return;
      rev = r.rev; dirty = false; status.textContent = 'Saved';
    } catch (e) {
      if (e.status === 409 && e.data?.current) {
        rev = e.data.current.rev; ta.value = e.data.current.text; dirty = false; status.textContent = 'Updated from another tab';
        toast('Your notes changed in another tab, so I loaded that version.');
      } else status.textContent = 'Not saved (offline?)';
    }
  }, 800);
  ta.addEventListener('input', () => { dirty = true; status.textContent = 'Typing…'; save(); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); leaveDock(); } });
  window.addEventListener('pagehide', () => save.flush());

  return {
    el,
    focus: () => ta.focus(),
    async setTopic(topic) {
      save.flush();
      topicId = topic?.id ?? null;
      dirty = false;
      ta.disabled = !topic;
      ta.value = '';
      status.textContent = '';
      if (!topic) return;
      const id = topic.id;
      try {
        const n = await api.notes(id);
        if (id !== topicId) return;
        ta.value = n.text; rev = n.rev;
      } catch { status.textContent = 'Could not load notes'; }
    },
  };
}

// ------------------------------------------------------------------ dock
export function createDock({ getLive }) {
  const S = { topic: null, doc: null, thread: null, mode: 'ask', streaming: false, ac: null, fresh: false, quote: '', token: 0, last: null };

  // ---- skeleton
  const tabTutor = h('button', { class: 'dock-tab is-on', type: 'button', role: 'tab', id: 'tab-tutor', 'aria-selected': 'true', 'aria-controls': 'pane-tutor', onclick: () => showTab('tutor') }, icon('chat', 15), 'Tutor');
  const tabNotes = h('button', { class: 'dock-tab', type: 'button', role: 'tab', id: 'tab-notes', 'aria-selected': 'false', 'aria-controls': 'pane-notes', onclick: () => showTab('notes', true) }, icon('note', 15), 'Notes');
  const head = h('header', { class: 'dock-head' },
    h('div', { class: 'dock-tabs', role: 'tablist', 'aria-label': 'Tutor and notes' }, tabTutor, tabNotes),
    h('button', { class: 'btn-icon dock-close', type: 'button', 'aria-label': 'Close panel', onclick: () => shell.setDock(false, { remember: false }) }, icon('x', 18)));

  const ctxChip = h('div', { class: 'ctx-chip', title: 'The tutor is given this page as context' });
  const modeBar = h('div', { class: 'seg-ctl', role: 'group', 'aria-label': 'Chat mode', hidden: true },
    h('button', { type: 'button', class: 'is-on', dataset: { mode: 'roleplay' }, onclick: () => setMode('roleplay') }, 'Role-play'),
    h('button', { type: 'button', dataset: { mode: 'ask' }, onclick: () => setMode('ask') }, 'Ask the tutor'));
  const threadBtn = h('button', { class: 'thread-btn', type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', onclick: () => toggleMenu() });
  const threadMenu = h('ul', { class: 'thread-menu', role: 'listbox', hidden: true });
  const newBtn = h('button', { class: 'btn-icon', type: 'button', title: 'Start a new chat', 'aria-label': 'Start a new chat', onclick: () => newChat() }, icon('plus', 17));
  const histLink = h('a', { class: 'btn-icon', href: '/chats', title: 'All saved chats', 'aria-label': 'All saved chats' }, icon('history', 17));
  const bar = h('div', { class: 'thread-bar' }, h('div', { class: 'thread-pick' }, threadBtn, threadMenu), newBtn, histLink);

  const msgs = h('div', { class: 'msgs', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation' });
  const starters = h('div', { class: 'starters' });
  const quoteChip = h('div', { class: 'quote-chip', hidden: true });
  const input = h('textarea', { class: 'composer-ta', rows: '1', placeholder: 'Ask about this page…', 'aria-label': 'Message the tutor', maxlength: '8000' });
  const sendBtn = h('button', { class: 'send', type: 'submit', 'aria-label': 'Send' }, icon('send', 18));
  const debriefBtn = h('button', { class: 'btn btn-xs debrief-btn', type: 'button', hidden: true, onclick: () => debrief() }, icon('sparkle', 13), 'End and debrief');
  const composer = h('form', { class: 'composer', onsubmit: (e) => { e.preventDefault(); onSubmit(); } }, quoteChip, h('div', { class: 'composer-row' }, input, sendBtn), debriefBtn);
  const paneTutor = h('section', { class: 'pane pane-tutor', role: 'tabpanel', id: 'pane-tutor', 'aria-labelledby': 'tab-tutor' }, ctxChip, modeBar, bar, msgs, starters, composer);
  const notes = createNotes();
  const paneNotes = h('section', { class: 'pane pane-notes', role: 'tabpanel', id: 'pane-notes', 'aria-labelledby': 'tab-notes', hidden: true }, notes.el);
  const empty = h('div', { class: 'dock-empty', hidden: true }, icon('chat', 28), h('p', null, 'Open any page and the tutor will already know what you are looking at.'), h('a', { class: 'btn', href: '/' }, 'Browse the book'));
  const el = h('div', { class: 'dock-inner' }, head, paneTutor, paneNotes, empty);

  // ---- helpers
  const nearBottom = () => msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 90;
  const stick = (force = false) => { if (force || nearBottom()) msgs.scrollTop = msgs.scrollHeight; };

  function showTab(name, focus = false) {
    const t = name === 'tutor';
    tabTutor.classList.toggle('is-on', t); tabNotes.classList.toggle('is-on', !t);
    tabTutor.setAttribute('aria-selected', String(t)); tabNotes.setAttribute('aria-selected', String(!t));
    paneTutor.hidden = !t; paneNotes.hidden = t;
    if (focus) (t ? input : { focus: () => notes.focus() }).focus();
  }

  function autosize() { input.style.height = 'auto'; input.style.height = `${Math.min(160, input.scrollHeight)}px`; }

  function paintComposer() {
    const streaming = S.streaming;
    sendBtn.replaceChildren(icon(streaming ? 'stop' : 'send', 18));
    sendBtn.setAttribute('aria-label', streaming ? 'Stop answering' : 'Send');
    sendBtn.classList.toggle('is-stop', streaming);
    input.placeholder = S.mode === 'roleplay' ? 'Reply in character…' : S.quote ? 'What would you like to know about this?' : 'Ask about this page…';
    debriefBtn.hidden = !(S.topic?.hasRoleplay && S.mode === 'roleplay');
    modeBar.hidden = !S.topic?.hasRoleplay;
    modeBar.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === S.mode));
    const showStarters = S.topic && !streaming && S.mode === 'ask' && (!S.thread || S.thread.messages.filter((m) => m.role === 'user').length === 0);
    starters.hidden = !showStarters;
  }

  function paintStarters() {
    const list = S.topic?.chat?.starters?.length ? S.topic.chat.starters : DEFAULT_STARTERS;
    starters.replaceChildren(...list.slice(0, 5).map((t) => h('button', { class: 'starter', type: 'button', onclick: () => send(t) }, t)));
  }

  function paintThreadBar() {
    const threads = (S.doc?.threads || []).filter((t) => t.kind === (S.mode === 'ask' ? 'ask' : 'roleplay') && (t.messages.some((m) => m.role === 'user') || t.id === S.thread?.id));
    const title = S.thread && S.thread.title !== 'New chat' ? S.thread.title : S.thread?.kind === 'roleplay' ? 'Role-play' : 'New chat';
    threadBtn.replaceChildren(h('span', { class: 'thread-title' }, S.fresh && !S.thread ? 'New chat' : clip(title, 40)), icon('chevron-down', 15));
    threadMenu.replaceChildren(...(threads.length ? [...threads].reverse().map((t) => h('li', { role: 'option', 'aria-selected': String(t.id === S.thread?.id) }, h('button', { type: 'button', class: t.id === S.thread?.id ? 'is-on' : '', onclick: () => pickThread(t.id) }, h('span', null, clip(t.title, 46)), h('small', null, relTime(t.updatedAt))))) : [h('li', { class: 'thread-none' }, 'No earlier chats on this page.')]));
  }
  function toggleMenu(force) {
    const open = force ?? threadMenu.hidden;
    threadMenu.hidden = !open;
    threadBtn.setAttribute('aria-expanded', String(open));
  }
  document.addEventListener('click', (e) => { if (!e.target.closest?.('.thread-pick')) toggleMenu(false); });

  // ---- message rendering
  function userBubble(m) {
    return h('div', { class: 'msg msg-user' }, m.quote ? h('blockquote', { class: 'msg-quote' }, clip(m.quote, 180)) : null, h('div', { class: 'msg-text' }, m.content));
  }
  const personaLabel = () => (S.mode === 'roleplay' ? S.topic?.scenario?.personaLabel : null);

  function aiBubble(m) {
    const b = assistantBubble();
    b.setText(m.content || '', m.status);
    if (m.scripted) b.el.classList.add('is-scripted');
    return b.el;
  }

  function assistantBubble() {
    const md = h('div', { class: 'msg-md is-streaming' });
    const typing = h('span', { class: 'typing', role: 'status', 'aria-label': 'The tutor is writing' }, h('i'), h('i'), h('i'));
    const note = h('div', { class: 'msg-note', hidden: true });
    const actions = h('div', { class: 'msg-actions' });
    const el = h('div', { class: 'msg msg-ai' }, personaLabel() ? h('div', { class: 'msg-who' }, personaLabel()) : null, md, typing, note, actions);
    let raf = 0;
    let text = '';
    const draw = () => { raf = 0; md.innerHTML = renderMarkdown(text); stick(); };
    const finishView = (status) => {
      md.classList.remove('is-streaming');
      typing.hidden = true;
      if (raf) { cancelAnimationFrame(raf); draw(); }
      actions.replaceChildren();
      if (text) actions.append(h('button', { class: 'btn btn-quiet btn-xs', type: 'button', onclick: async (e) => { if (await copyText(text)) { e.currentTarget.textContent = 'Copied'; setTimeout(() => (e.currentTarget.textContent = 'Copy'), 1200); } } }, 'Copy'));
      const flag = { stopped: 'Stopped.', interrupted: 'The connection dropped, so this answer may be incomplete.', length: 'Cut off at the length limit. Ask me to continue.' }[status];
      if (flag) { note.hidden = false; note.className = `msg-note is-${status}`; note.textContent = flag; }
    };
    return {
      el,
      setText(t, status) { text = t || ''; typing.hidden = true; md.innerHTML = renderMarkdown(text); finishView(status); },
      update(t) { text = t; typing.hidden = true; if (!raf) raf = requestAnimationFrame(draw); },
      status(msg) { note.hidden = !msg; note.className = 'msg-note'; note.textContent = msg || ''; },
      done(d) { finishView(d.status); },
      fail(message, retry) {
        md.classList.remove('is-streaming'); typing.hidden = true;
        note.hidden = false; note.className = 'msg-note is-error'; note.replaceChildren(icon('alert', 14), h('span', null, message));
        actions.replaceChildren(retry ? h('button', { class: 'btn btn-xs', type: 'button', onclick: retry }, icon('reset', 13), 'Try again') : null);
      },
    };
  }

  function renderThread() {
    msgs.replaceChildren();
    const t = S.thread;
    if (!t || !t.messages.length) {
      if (S.topic && S.mode === 'ask') msgs.append(h('div', { class: 'msgs-intro' }, h('p', { class: 'intro-title' }, 'Ask about this page'), h('p', { class: 'muted' }, 'I can see exactly what you see: the idea, the code, the animation. Ask anything, or pick a prompt below.')));
    } else {
      for (const m of t.messages) if (m.content || m.role === 'assistant') msgs.append(m.role === 'user' ? userBubble(m) : aiBubble(m));
    }
    stick(true);
    paintThreadBar();
    paintComposer();
  }

  // ---- data flow
  function latestThread(kind) { return [...(S.doc?.threads || [])].reverse().find((t) => t.kind === kind) || null; }

  async function loadFor(topic) {
    const my = ++S.token;
    S.mode = topic.hasRoleplay ? 'roleplay' : 'ask';
    S.fresh = false; S.quote = ''; renderQuote();
    try { S.doc = await api.chats(topic.id); } catch { S.doc = { threads: [] }; }
    if (my !== S.token) return;
    if (S.mode === 'roleplay' && !latestThread('roleplay')) {
      try { const t = await api.newThread(topic.id, { kind: 'roleplay' }); S.doc.threads.push(t); } catch { /* shows the empty state */ }
      if (my !== S.token) return;
    }
    S.thread = latestThread(S.mode === 'ask' ? 'ask' : 'roleplay');
    renderThread();
  }

  async function setMode(mode) {
    if (S.streaming || mode === S.mode) return;
    S.mode = mode; S.fresh = false;
    if (mode === 'roleplay' && !latestThread('roleplay')) {
      try { const t = await api.newThread(S.topic.id, { kind: 'roleplay' }); S.doc.threads.push(t); } catch { /* ignore */ }
    }
    S.thread = latestThread(mode === 'ask' ? 'ask' : 'roleplay');
    renderThread();
  }

  function pickThread(id) {
    if (S.streaming) return;
    S.thread = S.doc.threads.find((t) => t.id === id) || S.thread;
    S.fresh = false; toggleMenu(false); renderThread();
  }

  async function newChat() {
    if (S.streaming || !S.topic) return;
    if (S.mode === 'roleplay') {
      try { const t = await api.newThread(S.topic.id, { kind: 'roleplay', fresh: true }); S.doc.threads.push(t); S.thread = t; } catch (e) { toast(e.message, { kind: 'error' }); return; }
    } else { S.thread = null; S.fresh = true; }
    renderThread(); input.focus();
  }

  function syncThread(threadId, firstText) {
    if (S.thread?.id === threadId) return;
    S.thread = { id: threadId, kind: S.mode === 'ask' ? 'ask' : 'roleplay', title: clip(firstText.replace(/\s+/g, ' '), 64), messages: [{ role: 'user' }], createdAt: Date.now(), updatedAt: Date.now() };
  }

  async function refreshDoc() {
    if (!S.topic) return;
    const id = S.topic.id;
    try {
      const doc = await api.chats(id);
      if (!S.topic || S.topic.id !== id || S.streaming) return;
      S.doc = doc;
      S.thread = doc.threads.find((t) => t.id === S.thread?.id) || S.thread;
      paintThreadBar(); paintComposer();
    } catch { /* offline */ }
  }

  async function send(text, { mode = S.mode, retry = null } = {}) {
    if (S.streaming || !S.topic) return;
    text = text.trim();
    if (!text && mode !== 'debrief') return;
    const topicId = S.topic.id;
    const quote = retry ? retry.quote : S.quote;
    const clientMsgId = retry ? retry.clientMsgId : uid('c');
    if (!retry) {
      msgs.querySelector('.msgs-intro')?.remove();
      if (mode === 'debrief') msgs.append(h('div', { class: 'msg msg-user is-system' }, h('div', { class: 'msg-text' }, 'End the role-play and give me a debrief.')));
      else msgs.append(userBubble({ content: text, quote }));
      S.quote = ''; renderQuote(); input.value = ''; autosize();
    }
    const bubble = assistantBubble();
    msgs.append(bubble.el);
    stick(true);
    S.streaming = true; S.ac = new AbortController(); paintComposer();
    let acc = '';
    let failed = false;
    const payload = { topicId, threadId: S.thread?.id, clientMsgId, message: text, quote: quote || undefined, mode, fresh: S.fresh && !S.thread, live: getLive?.() || undefined };
    const again = () => { bubble.el.remove(); send(text, { mode, retry: { quote, clientMsgId } }); };
    try {
      await streamChat(payload, {
        signal: S.ac.signal,
        onMeta: (m) => { syncThread(m.threadId, text || 'Debrief'); S.fresh = false; },
        onDelta: (t) => { acc += t; bubble.update(acc); },
        onStatus: (s) => bubble.status(s.retrying ? 'DeepSeek is busy, retrying…' : ''),
        onError: (e) => { failed = true; bubble.fail(e.message, e.code === 'key_invalid' || e.code === 'balance_empty' ? null : again); },
        onDone: (d) => { if (!failed) bubble.done(d); else if (acc) bubble.done(d); },
      });
    } catch (e) {
      if (e.name === 'AbortError') bubble.done({ status: 'stopped' });
      else bubble.fail(e.message, e.status === 429 || e.code === 'offline' ? again : null);
    } finally {
      S.streaming = false; S.ac = null; paintComposer();
      refreshDoc();
    }
  }

  function debrief() { if (S.mode !== 'roleplay') setMode('roleplay').then(() => send('', { mode: 'debrief' })); else send('', { mode: 'debrief' }); }

  function onSubmit() {
    if (S.streaming) { S.ac?.abort(); return; }
    send(input.value, { mode: S.mode });
  }

  function renderQuote() {
    quoteChip.hidden = !S.quote;
    quoteChip.replaceChildren(...(S.quote ? [icon('quote', 13), h('span', null, clip(S.quote, 120)), h('button', { type: 'button', class: 'btn-icon btn-icon-sm', 'aria-label': 'Remove quote', onclick: () => { S.quote = ''; renderQuote(); paintComposer(); } }, icon('x', 13))] : []));
  }

  // ---- events
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); onSubmit(); }
    else if (e.key === 'Escape') { e.preventDefault(); leaveDock(); }
  });
  msgs.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-copy]');
    if (!b) return;
    copyText(b.closest('.md-code').querySelector('code').textContent).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1200); });
  });

  // ---- public API
  return {
    el,
    showTab,
    focusComposer: () => { showTab('tutor'); input.focus(); },
    async setTopic(topic) {
      const same = S.topic?.id === topic?.id;
      if (same && topic) return;
      S.ac?.abort();
      S.topic = topic;
      S.thread = null; S.doc = null; S.last = null;
      paneTutor.hidden = !topic || !tabTutor.classList.contains('is-on');
      paneNotes.hidden = !topic || !tabNotes.classList.contains('is-on');
      empty.hidden = !!topic;
      head.querySelector('.dock-tabs').hidden = !topic;
      notes.setTopic(topic);
      if (!topic) { S.token++; return; }
      ctxChip.replaceChildren(icon('book', 13), h('span', null, 'Knows this page: ', h('b', null, clip(topic.title, 48))));
      paintStarters();
      msgs.replaceChildren(); paintThreadBar(); paintComposer();
      await loadFor(topic);
    },
    askAbout(quote) {
      showTab('tutor');
      S.quote = quote.slice(0, 1200); renderQuote(); paintComposer(); input.focus();
    },
    askError(text, code) {
      showTab('tutor');
      if (S.mode === 'roleplay') S.mode = 'ask', S.thread = latestThread('ask');
      renderThread();
      send(`My code gave this error. What is wrong, and how do I fix it?\n\n${text}`, { mode: 'ask' });
    },
    debrief,
  };
}
