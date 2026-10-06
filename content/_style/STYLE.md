# Style guide — read this first

You are writing one page of **BackendEngineer**, a short, crisp, book-style course that takes an adult learner from JavaScript basics to production backends. The learner knows basic programming but is new to backend work. Each page teaches **one idea** in four short frames; the learner should grasp the core idea in under a minute per frame. The syllabus gives you a topic name only. **Write your own explanations and examples. Never imitate any course's wording or examples.**

## Voice
- Calm, direct, concrete. Second person ("you"), present tense, active voice.
- No hype, no emoji, no jokes, no filler ("simply", "just", "powerful", "robust", "seamless", "leverage", "utilize").
- Sentences ≤ 20 words. One idea per sentence. Plain words.
- Say what a thing **is** or **does** before how it works.

## The four frames (you fill slots; the renderer lays them out)
1. **Core idea** — `idea`: one sentence, "X is …" or "X lets you …", the definition a smart friend would give (≤ 28 words). `analogy`: an everyday picture (≤ 30 words) plus `breaks` — where the analogy stops being true (≤ 14 words). Map at most three pairs.
2. **How it works** — `points`: 3 or 4 complete sentences (≤ 14 words each), plus one `hero` visual that shows the mechanism (see AUTHORING.md for the kinds). The visual does the heavy lifting; the points are the short reading.
3. **In code** — `code`: one or two small examples (≤ 14 lines, ≤ 18 for YAML/SQL/Dockerfile, ≤ 80 columns). Longer needs a `walk`.
4. **Watch out · Check** — `pitfalls`: 2 or 3 real mistakes (≤ 16 words each). `quiz`: one question. `takeaway`: one sentence the learner can repeat (≤ 14 words).

Frame 1 (idea + analogy) ≤ 74 words in total. Frame 4 (pitfalls + takeaway) ≤ 70.

## Writing rules
- **Core idea first.** Never open with history, motivation or "In this lesson…".
- **Backticks** around identifiers, commands, flags, file names and short code: `app.use`, `npm ci`, `-p`. Never inside `title`.
- **Title:** ≤ 6 words, a noun phrase a reader would search for ("The event loop", "Your first Dockerfile"). Not the syllabus sentence.
- **Pitfalls** are actions to avoid or check, phrased so the learner can act.
- **Quiz:** if the page has runnable code, ask "what does this print?" with the literal outputs as options (≤ 10 words each). Otherwise ask a concept question with one clearly right answer and three plausible misconceptions as the others. `why` explains the mechanism in ≤ 30 words. 3 or 4 options; the right answer should not always be the same position.
- **Chat starters:** three questions a learner would genuinely ask about this page.

## Accuracy rules (a wrong book is worse than a short one)
1. State only what you are sure of. **Omit rather than guess.**
2. Every API, flag, option, default and error name must be real for the pinned versions: **Node 20.20**, **Express 5.2** (`app.get('*')` is invalid; `req.body` is `undefined` until a body parser runs), npm 10. For anything else say only what is stable across versions.
3. No precise numbers, limits, prices or benchmarks unless you are certain.
4. Security guidance must be correct and conservative. Never show a hard-coded secret except as a flagged mistake.
5. If a topic needs something this book cannot run (Docker, AWS, Postgres, MongoDB, shell), mark the snippet `static` + `illustrative: true` and keep commands to flags you are certain exist.

## Spellings
JavaScript · Node.js · npm · Express · PostgreSQL ("Postgres" is fine) · MongoDB · Mongoose · Drizzle ORM · JWT · REST · API · HTTP · URL · JSON · Docker · Dockerfile · `package.json` · middleware · callback · async/await · event loop · "log in" (verb) / "login" (noun).

## Code rules
- ES modules, file extension `.mjs`. Use `.cjs` only when CommonJS is the lesson.
- **Node 20 only.** Do not use `Object.groupBy`, `Promise.withResolvers`, `Array.fromAsync`, `fs.glob`, `WebSocket`.
- Output must be **deterministic**: no timestamps, random values, ports or machine paths in what is printed.
- Run modes: `browser` — pure JavaScript, or only `events`, `buffer`, `path`, `util`, `fs` (in-memory), `assert`, `timers`, `os`, basic `process`; it must print the same in the browser and in Node, so no `process.nextTick`/`setImmediate` ordering demos. `captured` — needs real Node (`http`, Express, real `fs`, `crypto`, `child_process`, nextTick ordering): the build runs it and records the output, and a server example must listen on port `0`, call itself, and close itself. `static` — cannot run here.
- **Never type output into prose or JSON.** The build records it.

## A good one and a bad one
✗ "Leveraging the powerful event-driven, non-blocking I/O model, Node.js empowers developers to build highly scalable applications." (hype, 17 words, says nothing concrete)
✓ "Node runs your JavaScript on one thread. The event loop hands it finished work, one callback at a time." (concrete, testable)

✗ points: "It is important to understand that middleware is basically a function." (filler)
✓ points: "Calling `next()` passes control to the next function in the chain."

## Exemplars to imitate (read the JSON and its code)
- `content/c02/c02-t09.json` — animation hero (lanes), browser + captured code, output quiz.
- `content/c04/c04-t08.json` — pipeline animation, real Express example with a walk.
- `content/c09/c09-t10.json` — compare hero, static Dockerfile with a walk.
- `content/c02/c02-t11.json` — flow hero, one editable snippet.
