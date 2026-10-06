// One page of the book: loads the topic, builds its frames, drives the deck, feeds the tutor its context.
import { h, icon, pad2, applyHue } from '../ui.js';
import { api } from '../api.js';
import { state, topicMeta, chapterOf } from '../state.js';
import { shell } from '../shell.js';
import { buildFrames } from '../frames.js';
import { createDeck } from '../deck.js';
import { patchProgress } from '../progress.js';

function skeleton() {
  return h('div', { class: 'deck skeleton', 'aria-busy': 'true', 'aria-label': 'Loading' },
    h('div', { class: 'stage-head' }), h('div', { class: 'stage-body' }, h('div', { class: 'frame' }, h('div', { class: 'f-col f-main' }, h('div', { class: 'sk sk-k' }), h('div', { class: 'sk sk-t' }), h('div', { class: 'sk sk-l' }), h('div', { class: 'sk sk-l short' })))), h('div', { class: 'stage-foot' }));
}

export async function topicView(id, frameParam, rc) {
  const meta = topicMeta(id);
  if (!meta) {
    shell.stage.replaceChildren(h('div', { class: 'empty-state' }, h('h1', null, 'No such page'), h('a', { class: 'btn btn-primary', href: '/' }, 'Back to the bookshelf')));
    return {};
  }
  const ch = chapterOf(meta.chapter);
  applyHue(ch.hue);
  shell.setCrumbs([{ label: 'Bookshelf', href: '/' }, { label: `${pad2(ch.n)} · ${ch.title}`, href: `/c/${ch.id}` }, { label: meta.title }]);
  shell.stage.replaceChildren(skeleton());

  let topic;
  try {
    topic = await api.topic(id);
  } catch (e) {
    if (rc?.stale()) return {};
    shell.stage.replaceChildren(h('div', { class: 'empty-state' }, h('h1', null, 'Could not load this page'), h('p', { class: 'muted' }, e.message), h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Try again')));
    return {};
  }
  if (rc?.stale()) return {};

  state.topic = topic;
  shell.dock.setTopic(topic);
  patchProgress(id, { visited: true });

  const live = {};
  const ctx = {
    topic,
    setLive: (p) => Object.assign(live, p),
    refresh: () => {},
    focusStage: () => shell.focusStage(),
    openChat: () => { shell.setDock(true, { focus: true, remember: false }); },
    askError: (text, code) => { shell.setDock(true, { remember: false }); shell.dock.askError(text, code); },
    debrief: () => { shell.setDock(true, { remember: false }); shell.dock.debrief(); },
  };
  const frames = buildFrames(topic);
  const startAt = Number.isInteger(parseInt(frameParam, 10)) ? parseInt(frameParam, 10) - 1 : 0;
  const deck = createDeck({ topic, frames, startAt, ctx });
  shell.stage.replaceChildren(deck.el);
  shell.getLive = () => ({ ...deck.live(), code: live.code || '', error: live.error || '', challenge: live.challenge || '', revealed: live.revealed || '' });
  await deck.start();

  return {
    keydown: (e) => deck.keydown(e),
    destroy() {
      shell.getLive = null;
      state.topic = null;
      deck.destroy();
    },
  };
}
