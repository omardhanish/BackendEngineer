// Keyboard shortcuts + display preferences.
import { h, icon } from './ui.js';
import { pref } from './state.js';

const KEYS = [
  ['Reading', [['→ / Space', 'Step the animation, then the next frame'], ['←', 'Step back'], ['PgUp / PgDn', 'Previous / next frame'], ['[  ]', 'Previous / next page'], ['P', 'Play or pause the animation'], ['1–4', 'Pick a quiz answer']]],
  ['Around the book', [['⌘K  /  Ctrl K', 'Search pages and saved chats'], ['T', 'Contents'], ['B', 'Switch book'], ['C', 'Ask the tutor'], ['N', 'Your notes'], ['?', 'This help']]],
  ['In code and chat', [['⌘↵  /  Ctrl ↵', 'Run the code'], ['Esc', 'Leave the editor or chat, back to the page'], ['Enter', 'Send a chat message (Shift+Enter for a new line)']]],
];

export function createHelp({ onTheme, onMotion }) {
  const motion = h('input', { type: 'checkbox', id: 'opt-motion', checked: pref('motion') === 'reduce', onchange: (e) => onMotion(e.target.checked) });
  const dlg = h('dialog', { class: 'dialog help', 'aria-label': 'Keyboard shortcuts and display options' },
    h('div', { class: 'dlg-head' }, h('h2', null, 'Shortcuts'), h('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Close', onclick: () => dlg.close() }, icon('x', 18))),
    h('div', { class: 'help-grid' }, KEYS.map(([group, rows]) => h('section', null, h('h3', null, group), h('dl', null, rows.flatMap(([k, d]) => [h('dt', null, k.split('  ').map((x) => h('kbd', null, x))), h('dd', null, d)]))))),
    h('div', { class: 'help-opts' },
      h('label', { for: 'opt-motion', class: 'opt' }, motion, h('span', null, 'Reduce motion', h('small', null, 'Instant steps, no sliding or autoplay. Also follows your system setting.'))),
      h('button', { class: 'btn', type: 'button', onclick: onTheme }, icon('sun', 16), 'Change theme')));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  return { open: () => { motion.checked = pref('motion') === 'reduce'; if (!dlg.open) dlg.showModal(); }, el: dlg };
}
