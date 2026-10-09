// Safe Markdown for model output and code highlighting. markdown-it runs with html:false (raw HTML is
// escaped), only http/https/mailto links survive, images become plain text (no beacon exfiltration),
// and every link opens with rel=noopener. Output is still only ever assigned via innerHTML from here.
import { escapeHtml } from './ui.js';
import { LANGUAGES } from './languages.js';

// name an author or the model might write -> the Prism grammar. Built from the one language list, plus a few extras.
const ALIAS = { tsx: 'typescript', json5: 'json', mongodb: 'javascript' };
for (const [id, l] of Object.entries(LANGUAGES)) {
  if (!l.prism) continue;
  ALIAS[id] = l.prism;
  for (const a of l.aliases) ALIAS[a] = l.prism;
}

export function normLang(lang = '') {
  const l = String(lang).toLowerCase().trim();
  return ALIAS[l] || l;
}

export function highlightCode(code, lang = '') {
  const l = normLang(lang);
  const grammar = window.Prism?.languages?.[l];
  if (!grammar) return escapeHtml(code);
  try { return window.Prism.highlight(code, grammar, l); } catch { return escapeHtml(code); }
}

/**
 * Highlight into one HTML string per line, so single lines can be marked (walkthroughs, error lines).
 * Multi-line tokens (comments, template strings) are split at newlines; the innermost token's class wins.
 */
export function highlightLines(code, lang = '') {
  const l = normLang(lang);
  const grammar = window.Prism?.languages?.[l];
  if (!grammar) return code.split('\n').map(escapeHtml);
  const lines = [''];
  const add = (text, cls) => {
    text.split('\n').forEach((part, i) => {
      if (i) lines.push('');
      if (part) lines[lines.length - 1] += cls ? `<span class="token ${cls}">${escapeHtml(part)}</span>` : escapeHtml(part);
    });
  };
  const walk = (tok, cls) => {
    if (typeof tok === 'string') return add(tok, cls);
    const own = [tok.type, ...(tok.alias ? [].concat(tok.alias) : [])].join(' ');
    if (Array.isArray(tok.content)) tok.content.forEach((t) => walk(t, own));
    else walk(tok.content, own);
    return undefined;
  };
  window.Prism.tokenize(code, grammar).forEach((t) => walk(t, ''));
  return lines;
}

let md;
function instance() {
  if (md) return md;
  md = window.markdownit({ html: false, linkify: true, breaks: false, typographer: false });
  md.validateLink = (url) => /^(https?:|mailto:|#)/i.test(url.trim());
  const defaultLink = md.renderer.rules.link_open || ((t, i, o, e, self) => self.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
    return defaultLink(tokens, idx, opts, env, self);
  };
  md.renderer.rules.image = (tokens, idx) => escapeHtml(tokens[idx].content || '[image]');
  md.renderer.rules.fence = (tokens, idx) => {
    const t = tokens[idx];
    const lang = (t.info || '').trim().split(/\s+/)[0];
    const shown = lang ? escapeHtml(normLang(lang)) : 'text';
    return `<div class="md-code"><div class="md-code-bar"><span>${shown}</span><button type="button" class="md-copy" data-copy>Copy</button></div><pre><code>${highlightCode(t.content.replace(/\n$/, ''), lang)}</code></pre></div>`;
  };
  md.renderer.rules.code_block = md.renderer.rules.fence;
  return md;
}

export function renderMarkdown(text) {
  return instance().render(text);
}
