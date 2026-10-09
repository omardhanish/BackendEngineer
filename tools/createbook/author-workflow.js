export const meta = {
  name: 'author-book-pages',
  description: 'Write the pages of a book in batches: author, then clarity and technical review in parallel, then fix, then one cross-page check',
  whenToUse: 'Run by the 786CreateBook skill with args {slug, root, title, profile, audience, batches}. Not meant to be started by hand.',
  phases: [
    { title: 'Author', detail: 'one agent per batch writes the pages and their code, validates and captures' },
    { title: 'Review', detail: 'a clarity reviewer and a technical reviewer read each batch, independently and read-only' },
    { title: 'Fix', detail: 'one agent per batch applies the findings and re-validates' },
    { title: 'Cross-check', detail: 'one agent reads the whole book for duplicated or contradictory pages and inconsistent terms' },
  ],
}

// args: { slug, root, title, profile, audience, batches: [{batch, chapter, chapterTitle, outcomes, pages: [{id, heading, kind, depth, n, previous, next}]}] }
const { slug, root, title, profile, audience, batches } = args
if (!slug || !root || !Array.isArray(batches) || !batches.length) throw new Error('author-book-pages needs args {slug, root, batches}')

const BOOK = `content/books/${slug}`
const RULES = `
Rules for every agent in this job:
- Work from the project root ${root} (cd there for every command). Use only these commands: \`node tools/capture.mjs --book ${slug} <id>\` and \`node tools/validate.mjs --book ${slug} <id>\`. No npm install, no git, no servers, no network calls. Do not read .env.
- Touch only the pages you were given: ${BOOK}/<chapter>/<id>.json, ${BOOK}/code/<id>/ and, for role-play pages, ${BOOK}/roleplay/<id>.key.json. Never edit another page, the syllabus, book.json or anything under content/_style or content/_schema.
- Never copy any course's wording or examples. Write your own.`

const AUTHOR_SCHEMA = {
  type: 'object',
  properties: {
    written: { type: 'array', items: { type: 'string' } },
    problems: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, issue: { type: 'string' } }, required: ['id', 'issue'] } },
  },
  required: ['written', 'problems'],
}
const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'page id, e.g. c02-t05' },
          severity: { enum: ['fix', 'nit'], description: 'fix = a learner would be confused or misled, or something is wrong; nit = polish' },
          where: { type: 'string', description: 'the key or line, e.g. points[2], quiz.why, rake.py line 4' },
          problem: { type: 'string' },
          fix: { type: 'string', description: 'the exact change to make' },
        },
        required: ['id', 'severity', 'where', 'problem', 'fix'],
      },
    },
  },
  required: ['findings'],
}
const FIX_SCHEMA = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'string' } },
    unresolved: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, issue: { type: 'string' } }, required: ['id', 'issue'] } },
  },
  required: ['fixed', 'unresolved'],
}

const pageList = (b) => b.pages.map((p) => `- ${p.id} · heading "${p.heading}" · ${p.kind} · depth ${p.depth} (after: ${p.previous ?? 'start of the book'}; next: ${p.next ?? 'end of the book'})`).join('\n')
const readFirst = `Read first: content/_style/STYLE.md, content/_style/AUTHORING.md, ${BOOK}/_style/BOOK.md (this book's own rules win), then ${BOOK}/syllabus.json for your chapter.`

function authorPrompt(b) {
  return `You are writing pages of the book "${title}" (${slug}), profile "${profile}", for ${audience || 'a motivated adult learner'}. Chapter ${b.chapter}: "${b.chapterTitle}". By the end of the chapter the learner can: ${b.outcomes.join('; ') || 'see the chapter in syllabus.json'}.

${readFirst}
For the page shape, look at an exemplar: a page of this book that is already written (ls ${BOOK}/c*/), or content/books/backend-engineer/c02/c02-t09.json for a worked example with an animation.

Write these pages:
${pageList(b)}

The heading is what the learner asked to be taught: cover it, in your own words. The page "title" is your own short noun phrase (6 words at most), not the heading. Respect depth: 1 is a quick idea; 2 is a normal page with pitfalls and a quiz; 3 is a deep page with an analogy and a strong visual. Choose the hero visual that teaches best; do not use the same kind on every page. For kind "challenge" write a challenges set; for "roleplay" write the scenario and the server-only key file (see AUTHORING.md).

Code: ${profile === 'none' ? 'this is a concepts book; any snippet is run "static" and illustrative.' : `examples run for real as described in ${BOOK}/_style/BOOK.md. Run \`node tools/capture.mjs --book ${slug} <id>\` for every page that has runnable code, then \`node tools/validate.mjs --book ${slug} <id>\` for every page, and fix until both exit 0 with no errors. Never type program output into prose or JSON: the capture records it.`}
${RULES}

Return the ids you wrote, and any page you could not finish with the reason.`
}

function reviewPrompt(b, lens) {
  const ids = b.pages.map((p) => p.id).join(', ')
  const focus = lens === 'clarity'
    ? `You are the CLARITY reviewer. Read each page as the learner would (${audience || 'a motivated adult learner'}), frame by frame: core idea, how it works, in code, watch out and check. Judge: does the page actually teach its heading? One idea per frame? Plain words, short sentences, no hype or filler? Is the order sensible and does it follow from the previous page? Is the analogy honest and does it say where it breaks? Is the quiz fair, with exactly one right answer and the right index? Do the visual and the text agree? Is anything a beginner would trip over left unexplained?`
    : `You are the TECHNICAL reviewer. Check every factual claim, API, flag, option, default, error name and version against what is true for the pinned toolchain in ${BOOK}/versions.json. Read each code file and its recorded output (<file>.out.json): is the code correct and idiomatic, does the output really show what the text says, is it deterministic? Are the animation or diagram steps a faithful model of the mechanism? Are security statements correct and conservative? Is any number, limit or date stated without being certain?`
  return `${focus}

Book "${title}" (${slug}). Pages to review: ${ids}. Headings: ${b.pages.map((p) => `${p.id} "${p.heading}"`).join('; ')}.
${readFirst}
You are READ-ONLY: do not edit any file. You may run \`node tools/validate.mjs --book ${slug} <id>\`. Report only real problems. "fix" means a learner would be confused or misled, or something is wrong; "nit" is polish. If a page is good, return no finding for it. Quote the exact key or line in "where" and give the exact change in "fix".
${RULES}`
}

function fixPrompt(b, findings) {
  return `Apply these review findings to the pages of batch ${b.batch} of "${title}" (${slug}). Fix every "fix" finding. Apply a "nit" only if it is a quick, clear improvement. If a finding is wrong, leave the page as it is and say why.

${readFirst}
Findings:
${JSON.stringify(findings, null, 1)}

After editing, run \`node tools/capture.mjs --book ${slug} <id>\` for any page whose code changed, and \`node tools/validate.mjs --book ${slug} <id>\` for every page you touched; fix until clean. Keep every cap in STYLE.md (word counts, line counts).
${RULES}`
}

phase('Author')
const results = await pipeline(
  batches,
  (b) => agent(authorPrompt(b), { label: `author ${b.batch}`, phase: 'Author', schema: AUTHOR_SCHEMA }),
  async (authored, b) => {
    if (!authored) return { b, authored: null, findings: [] }
    const reviews = await parallel(['clarity', 'technical'].map((lens) => () => agent(reviewPrompt(b, lens), { label: `${lens} ${b.batch}`, phase: 'Review', schema: FINDINGS_SCHEMA })))
    const findings = reviews.filter(Boolean).flatMap((r) => r.findings)
    return { b, authored, findings }
  },
  async (r) => {
    const { b, authored, findings } = r
    if (!authored) return { batch: b.batch, written: [], problems: [{ id: b.batch, issue: 'the author agent did not finish' }], fixed: [], unresolved: [] }
    const mustFix = findings.filter((f) => f.severity === 'fix')
    if (!mustFix.length && findings.length < 3) return { batch: b.batch, written: authored.written, problems: authored.problems, fixed: [], unresolved: [], nits: findings.length }
    const fixed = await agent(fixPrompt(b, findings), { label: `fix ${b.batch}`, phase: 'Fix', schema: FIX_SCHEMA })
    return { batch: b.batch, written: authored.written, problems: authored.problems, fixed: fixed?.fixed ?? [], unresolved: fixed?.unresolved ?? [{ id: b.batch, issue: 'the fix agent did not finish' }], findings: findings.length }
  },
)
const done = results.filter(Boolean)
log(`${done.reduce((n, r) => n + r.written.length, 0)} pages written in ${done.length}/${batches.length} batches`)

phase('Cross-check')
const allIds = batches.flatMap((b) => b.pages.map((p) => p.id))
const cross = allIds.length < 8 ? null : await agent(
  `You are the BOOK-LEVEL reviewer of "${title}" (${slug}). Several authors wrote these pages in parallel, so look for what no single author could see: ${allIds.length} pages (${allIds[0]} … ${allIds.at(-1)}).
${readFirst}
Read every page JSON under ${BOOK}/c*/ (skim code files only when a page depends on them). Look for: two pages that teach the same thing; a page that uses a term or tool before an earlier page explains it; the same idea named two different ways; contradictions between pages; a heading from the syllabus that no page really covers; a chapter whose pages do not add up to its outcomes. You are READ-ONLY. Report only real problems as findings with severity "fix" (use "nit" for small wording differences). Return an empty list if the book holds together.
${RULES}`,
  { label: 'cross-check', phase: 'Cross-check', schema: FINDINGS_SCHEMA },
)

const crossFixes = (cross?.findings ?? []).filter((f) => f.severity === 'fix')
let crossFixed = null
if (crossFixes.length) {
  crossFixed = await agent(
    `Apply these book-level review findings to "${title}" (${slug}). They are about consistency between pages: fix each by editing the pages named. Change as little as possible; keep every cap in STYLE.md.
${readFirst}
Findings:
${JSON.stringify(crossFixes, null, 1)}
Afterwards run \`node tools/validate.mjs --book ${slug} <id>\` for every page you touched, and \`node tools/capture.mjs --book ${slug} <id>\` for any whose code changed; fix until clean. You may edit any page named in a finding (this is the one job where that is allowed).
- Work from the project root ${root}. No npm install, no git, no servers, no network calls. Do not read .env.`,
    { label: 'cross-fix', phase: 'Fix', schema: FIX_SCHEMA },
  )
}

return {
  pagesWritten: done.reduce((n, r) => n + r.written.length, 0),
  batches: done.map((r) => ({ batch: r.batch, written: r.written.length, findings: r.findings ?? 0, fixed: r.fixed.length })),
  authorProblems: done.flatMap((r) => r.problems.map((p) => ({ batch: r.batch, ...p }))),
  unresolved: done.flatMap((r) => r.unresolved.map((u) => ({ batch: r.batch, ...u }))),
  batchesLost: batches.length - done.length,
  crossCheck: { findings: cross?.findings ?? [], fixed: crossFixed?.fixed ?? [], unresolved: crossFixed?.unresolved ?? [] },
}
