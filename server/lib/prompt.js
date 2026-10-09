// Builds what DeepSeek sees. Static text first (tutor rules → page → neighbours) so repeated turns
// on the same page share a cacheable prefix; live state (frame, edited code, last error) goes in the
// final user turn. The quiz answer is included but the rules say to hint before revealing it.

import { DEFAULT_TUTOR } from './book-meta.js';

export const PROMPT_VERSION = 2;

const rulesFor = (tu) => `You are the in-page tutor of "${tu.name}", ${tu.about}.
The learner is reading ONE page of the book, given in <page>. Treat it as the source of truth for what they have just seen. Build on it; if you spot a real error in it, say so plainly.
Rules:
- Answer first, in as few words as fully answer the question (usually 180 words or fewer). No preamble, no restating the question.
- Prefer one concrete example${tu.examples ? ` (${tu.examples})` : ''} over abstract prose. Use short fenced code blocks with a language tag.
- Match the page's vocabulary. If the question needs a concept from a later chapter, give a one-line pointer instead of a deep dive.
- If you are unsure about a detail (versions, flags, API names, numbers), say so. Never invent APIs, flags or numbers.
- If the learner is stuck on the page's quiz or a coding challenge, hint first; reveal the answer or reference solution only if they ask for it after trying, or the <state> says they already revealed it.
- Use GitHub-flavoured Markdown. No images, no HTML.`;

const clip = (s, n) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n)}…` : s || '');

function heroText(h) {
  if (!h || typeof h !== 'object') return '';
  const steps = h.scenario?.steps || h.steps;
  if (Array.isArray(steps) && steps.some((s) => s?.caption)) {
    return `${h.type}${h.engine ? ` (${h.engine})` : ''} walk-through:\n${steps.filter((s) => s?.caption).map((s, i) => `  ${i + 1}) ${s.caption}`).join('\n')}`;
  }
  return `${h.type}: ${clip(JSON.stringify(h), 1500)}`;
}

/** Plain-text rendering of a page, used as the model's context. */
export function topicToText(t, maxChars = 40_000) {
  const L = [];
  L.push(`Title: ${t.title}`);
  L.push(`Chapter ${t.chapter.n}: ${t.chapter.title} · page ${t.position.index} of ${t.position.total} · type: ${t.kind}`);
  if (t.source && t.source !== t.title) L.push(`Syllabus topic: ${t.source}`);
  if (!t.authored) {
    L.push('(This page has not been written yet; only its syllabus topic is known. Teach from general knowledge and say so if asked about page details.)');
    return L.join('\n');
  }
  if (t.idea) L.push(`\nCORE IDEA: ${t.idea}`);
  if (t.analogy?.text) L.push(`ANALOGY: ${t.analogy.text}${t.analogy.breaks ? ` (Where it breaks: ${t.analogy.breaks})` : ''}`);
  if (t.points?.length) L.push(`\nKEY POINTS:\n${t.points.map((p) => `- ${p}`).join('\n')}`);
  if (t.hero) L.push(`\nVISUAL — ${heroText(t.hero)}`);
  if (t.scenario) L.push(`\nSCENARIO: ${clip(JSON.stringify(t.scenario), 6000)}`);
  for (const c of t.code || []) {
    L.push(`\nCODE [${c.file}]${c.caption ? ` — ${c.caption}` : ''}\n\`\`\`${c.lang || ''}\n${clip(c.source, 4000)}\n\`\`\``);
    if (c.captured?.stdout) L.push(`Recorded output${/\.sh$/.test(c.file) ? ' (shell transcript' + (c.captured.tool ? `, ${c.captured.tool}` : '') + ')' : c.captured.node ? ` on Node ${c.captured.node}${c.captured.tool ? `, ${c.captured.tool}` : ''}` : ''}:\n${clip(c.captured.stdout, 800)}`);
  }
  if (t.challenges?.items?.length) {
    L.push('\nCHALLENGES (the learner solves these in the page; coach with hints, never paste a reference solution unless the learner has revealed it or asks for it after trying):');
    for (const c of t.challenges.items) {
      L.push(`- [${c.id}] ${c.title}: ${c.prompt}\n  Starter code:\n${clip(c.starterSource, 700)}\n  Tests:\n${clip(c.testsSource, 900)}\n  Hints: ${(c.hints || []).join(' / ')}\n  REFERENCE SOLUTION (hidden from the learner until revealed):\n${clip(c.solutionSource, 700)}`);
    }
  }
  if (t.pitfalls?.length) L.push(`\nWATCH OUT:\n${t.pitfalls.map((p) => `- ${p}`).join('\n')}`);
  if (t.quiz) {
    const q = t.quiz;
    L.push(`\nQUIZ: ${q.q}\n${(q.options || []).map((o, i) => `  ${String.fromCharCode(65 + i)}) ${o}`).join('\n')}\n(answer: ${String.fromCharCode(65 + (q.answer ?? 0))} — hint before revealing)${q.why ? ` Why: ${q.why}` : ''}`);
  }
  if (t.takeaway) L.push(`\nTAKEAWAY: ${t.takeaway}`);
  return clip(L.join('\n'), maxChars);
}

function nearbyText(t) {
  const bits = [];
  if (t.prev) bits.push(`Previous page: ${t.prev.title}`);
  if (t.next) bits.push(`Next page: ${t.next.title}`);
  return bits.join('\n');
}

function roleplaySystem(t, key, tu) {
  return `You are playing a character in a hands-on role-play exercise inside the course "${tu.name}". Stay in character. The learner is the ${tu.learnerRole}; you are NOT their tutor in this mode.
<persona>
${key.persona}
</persona>
<setup>
${key.setup}
</setup>
${key.opening ? `<your_opening_line>\n${key.opening}\n</your_opening_line>\n` : ''}${key.hidden?.length ? `<hidden_facts>\nThese are things you know but only reveal in character, when the learner asks the right question or looks at the right thing. Never list them unprompted.\n${key.hidden.map((h) => `- ${h}`).join('\n')}\n</hidden_facts>\n` : ''}<page>
${topicToText(t, 12_000)}
</page>
Rules: keep every reply under 120 words; speak as the character (first person); do not invent evidence beyond what the page and the facts above provide; if the learner asks for something the scenario does not contain, say you do not have it. Use Markdown sparingly.`;
}

function debriefSystem(t, key, tu) {
  const rubric = (key.rubric || t.scenario?.rubric || []).map((r, i) => `${i + 1}. ${r.criterion || r.label || r}${r.levels ? ` — 0: ${r.levels[0]} | 1: ${r.levels[1]} | 2: ${r.levels[2]}` : ''}`).join('\n');
  return `You are ${tu.mentorRole} mentoring a learner after a role-play exercise in the course "${tu.name}". The role-play transcript is in the conversation. Grade the LEARNER's performance only from what they actually said or found.
<rubric>
${rubric}
</rubric>
${key.flaws?.length ? `<answer_key>\n${key.flaws.map((f) => `- ${f}`).join('\n')}\n</answer_key>\n` : ''}Output format (Markdown, under 300 words):
1. One-sentence overall verdict.
2. A compact table: criterion | score 0-2 | evidence (quote the learner briefly, or "not raised").
3. "What a strong answer adds": 3 bullets, concrete.
4. Final line exactly: SCORE: <total>/<max>`;
}

/**
 * @returns {{messages: Array, temperature: number, maxTokens: number}}
 */
export function buildMessages({ topic, mode, history, userText, quote, live, limits, key, book }) {
  const tutor = book?.tutor ?? DEFAULT_TUTOR;
  let system;
  if (mode === 'roleplay' && key) system = roleplaySystem(topic, key, tutor);
  else if (mode === 'debrief' && key) system = debriefSystem(topic, key, tutor);
  else system = `${rulesFor(tutor)}\n\n<page id="${topic.id}">\n${topicToText(topic, limits.pageChars)}\n</page>\n\n<nearby>\n${nearbyText(topic)}\n</nearby>`;

  // History: never lead with an assistant turn; trim oldest-first in chunks so the prefix stays stable.
  let past = history.slice();
  while (past.length && past[0].role === 'assistant') past.shift();
  const chars = (arr) => arr.reduce((n, m) => n + m.content.length, 0);
  while (past.length > limits.historyMessages || chars(past) > limits.historyChars) past = past.slice(4);
  while (past.length && past[0].role === 'assistant') past.shift();

  const bits = [];
  if (live) {
    const s = [];
    if (live.frameLabel) s.push(`viewing frame ${live.frame ?? '?'} "${live.frameLabel}"`);
    if (live.step != null) s.push(`animation step ${live.step}`);
    if (live.challenge) s.push(`working on challenge "${live.challenge}"`);
    if (live.revealed) s.push(`solutions already revealed: ${clip(live.revealed, 120)}`);
    if (live.error) s.push(`last run error: ${clip(live.error, 400)}`);
    if (s.length) bits.push(`<state>${s.join(' · ')}</state>`);
    if (live.code) bits.push(`<learner_code>\n${clip(live.code, 2000)}\n</learner_code>`);
  }
  if (quote) bits.push(`<quote>\n${clip(quote, 1200)}\n</quote>`);
  bits.push(mode === 'debrief' ? (userText || 'Please debrief me now.') : userText);

  const messages = [{ role: 'system', content: system }, ...past, { role: 'user', content: bits.join('\n\n') }];
  return { messages, temperature: mode === 'roleplay' ? 0.8 : mode === 'debrief' ? 0.3 : 0.5, maxTokens: limits.maxTokens };
}
