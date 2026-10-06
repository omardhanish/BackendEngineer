# Authoring reference — page JSON, visuals, code, commands

A page is `content/<chapter>/<id>.json` (e.g. `content/c04/c04-t09.json`) plus code files in `content/code/<id>/`. Ids, chapters, kinds and titles come from `content/syllabus.json`; **never invent ids**. Schema: `content/_schema/topic.schema.json`. Caps are enforced by `node tools/validate.mjs <id>`.

## Page JSON (all keys optional except `title`; see STYLE.md for the caps)
```jsonc
{
  "title": "Middleware",                         // ≤ 6 words
  "idea": "…",                                   // ≤ 28 words
  "analogy": { "text": "…", "breaks": "…" },     // ≤ 30 / ≤ 14 words
  "points": ["…", "…", "…"],                     // 3–4 sentences, ≤ 14 words each
  "hero": { … },                                 // one visual, see below
  "code": [ { "file": "chain.mjs", "lang": "js", "title": "Short tab name", "run": "browser", "caption": "…", "walk": [ { "lines": [1,2], "text": "≤ 18 words" } ] } ],
  "pitfalls": ["…", "…"],                        // 2–3, ≤ 16 words each
  "quiz": { "q": "…", "options": ["…","…","…"], "answer": 1, "why": "…", "code": "optional ≤ 10 lines shown above the options", "lang": "js" },
  "takeaway": "…",                               // ≤ 14 words
  "chat": { "starters": ["…", "…", "…"] }
}
```
Requirements: `idea`, `points`, `takeaway`, and a `hero` or at least one `code` example. Pages with depth ≥ 2 (see `syllabus.json`) also need `pitfalls` and a `quiz`. Depth 3 pages should have an `analogy`. `lang` ∈ js, json, bash, sql, yaml, docker, http, html, ejs, ts, diff, css. `walk` lines are **1-based**; at most 7 steps.

## Code files
`content/code/<id>/<file>` — exactly the text shown. `run`:
- `"browser"` editable and runnable in the page (see run rules in STYLE.md).
- `"captured"` shown static; **Run** replays the output recorded from real Node.
- `"static"` cannot be run here; add `"illustrative": true` for Docker/AWS/DB/shell.
After writing or editing code run `node tools/capture.mjs <id>` — it executes every `browser` and `captured` file on real Node 20 (in the file's own folder, so `import express from 'express'` works) and stores `<file>.out.json`. Exit code must be 0.

### Shell transcripts, real databases, determinism
- **Shell transcript:** `{ "file": "session.sh", "lang": "bash", "run": "captured" }`. Every line is one command, run in order in an empty home folder (`/home/ada`); the recording shows `$ command` and its REAL output. `cd dir` must be on its own line (it carries to the next line; `mkdir x && cd x` does not). `export NAME=value` carries over. Heredocs (`cat > f <<'EOF'`) and `\` continuations work. Git is configured for you: author Ada Lovelace, default branch `main`, fixed dates, so hashes are stable. No network (`curl`, `ssh`, `docker`, `aws`, `sudo`, `brew` are refused): for `git push` create a local bare repo as the remote (`git init --bare ../remote.git`). Interactive commands (`git rebase -i`, `git add -p`, editors) do not work. Use `run: "static"` + `illustrative: true` for shell that cannot run (Docker, AWS).
- **Real databases:** add `"needs": ["postgres"]` and/or `["mongo"]` to a `captured` snippet. A fresh, empty PostgreSQL 18 / MongoDB 8.2 is started for each run; read the connection string from `process.env.DATABASE_URL` (Postgres, e.g. `new pg.Client({ connectionString })` or `drizzle(process.env.DATABASE_URL)`) or `process.env.MONGO_URI` (`mongoose.connect(process.env.MONGO_URI)`). Create tables/collections in the snippet itself. Libraries in `content/code/node_modules` (see versions.json): `pg`, `drizzle-orm`, `mongoose`, `zod`, `jsonwebtoken`, `bcryptjs`, `express`, `nanoid`, `cookie-parser`, `cors`, `helmet`, `dotenv`, `morgan`, `express-session`, `express-validator`, `nodemailer`, `mailgen`, `ejs`. Always close connections so the process exits.
- **Determinism:** `capture` runs every snippet TWICE and fails if the output differs. Never print ObjectIds, `uuid`/`nanoid` values, dates, durations, ports, hashes of random salts (bcrypt output), or object key order that depends on timing. Print counts, field values you chose, error codes and messages.

### Challenge pages (kind `challenge`, or any page that benefits from practice)
Add `"challenges": { "intro": "≤ 25 words", "items": [ { "id": "parity", "title": "≤ 6 words", "prompt": "≤ 35 words, say exactly what to write", "starter": "parity.starter.js", "tests": "parity.tests.js", "solution": "parity.solution.js", "hints": ["nudge", "approach", "almost the answer"] } ] }` (1–12 items; hints: 2–3, each ≤ 25 words). Files live in `content/code/<id>/`, end in `.js`, and are PLAIN SCRIPT (no `import`/`export`, no `require`): the learner's file and your tests run together in the in-page runner, so the tests call the learner's function by name. Tests use two globals: `test('name', () => { … })` (name ≤ 10 words, 3–10 tests, each calling `eq(actual, expected)`; async tests may `await`). Starter ≤ 18 lines and RUNS CLEANLY but fails (a stub with a comment); solution ≤ 24 lines; every line ≤ 80 columns. Test edge cases and boundaries, not only the happy path. `validate` proves the solution passes every test and the starter fails; it also catches a starter that already passes. Exemplar: `content/c01/c01-t07.json`. Escape quotes inside JSON strings. A challenge page still needs `idea`, `points`, `takeaway`, a hero or code example, pitfalls and a quiz when depth ≥ 2. Browser-only: nothing in a challenge may need Node-only APIs, network or files.
- **Local challenge** (needs a real server or process, e.g. a native `http` server): `"mode": "local", "file": "task-server.mjs"` with `starter`, `solution`, `tests` all real `.mjs` files. The tests file imports `./<file>` (the learner's), starts what it needs on port 0, asserts with `node:assert`, prints one line per check, and exits non-zero on failure (run as `node <tests>`). `validate` copies the solution/starter next to the tests and requires solution → exit 0, starter → non-zero.

## Hero visuals — choose what teaches best; do not default to the same kind
Authors write data only. Every hero may have a `"title"` (≤ 8 words). Captions ≤ 24 words, one idea per step. Wrap code in `backticks` inside captions.

**`anim`** — an animation engine with a scenario; 2–14 steps, each with a `caption`.
- `"engine": "lanes"` — tokens moving between lanes (queues, stacks, background work). `scenario`: `{ code?: string[], lanes: [{id,label,kind?: "stack"|"queue"|"area",hint?}] (≤ 4), tokens: {id: {label, tone?: "sync"|"timer"|"micro"|"macro"|"io"|"neutral"}}, steps: [{caption, line?, at: {laneId: [tokenId…]}, active?: tokenId, out?: string[]}] }`. Each step lists the **full** contents of every lane. See `c02-t09`.
- `"engine": "pipeline"` — something travels through ordered stages and may come back (middleware, request → controller → model). `scenario`: `{ token: {label,tone?: "req"|"ok"|"err"}, stages: [{id,label,sub?,kind?: "end"}] (2–6), steps: [{caption, at: stageId, slot?: "top"|"bottom", token?: {label,tone}, state?: {stageId: "active"|"done"|"blocked"|"error"}, out?: string[]}] }`. Top slot = going in ("before"), bottom = coming back ("after"). See `c04-t08`.
- `"engine": "memory"` — code, call stack and heap. `scenario`: `{ code: string[] (≤ 12 lines), steps: [{caption, line?: 0-based, stack: [{name, vars: {name: "display string" | {ref: "o1", label?}}}] (bottom → top), heap?: [{id, label, props?: {k: string | {ref}}}]}] }`. Values are display strings (`"10"`, `"'hi'"`, `"undefined"`, `"ƒ add(a, b)"`). See `c01-t02`.

**`flow`** — boxes and arrows (≤ 8 nodes, labels ≤ 5 words). `{ nodes: [{id,label,sub?}], edges: [{from,to,label?,caption?,dashed?,back?}], steps?: [{caption, active: [nodeId…], edges: [edgeIndex…]}] }`. Without `steps`, each edge becomes a step using its `caption` (or `label`). `"dir": "TB"` forces top-to-bottom. See `c02-t11`.

**`seq`** — who talks to whom: `{ actors: [{id,label}] (2–5), messages: [{from,to,label,note?,dashed?}] (≤ 10) }`; one step per message (`note` is the caption).

**`timeline`** — `{ items: [{label, text}] }` (3–6), stepped in order.

**`compare`** — two columns: `{ left: {title, items[], tone?: "good"|"bad"}, right: {…}, verdict? }`, items 2–5, ≤ 12 words each. See `c09-t10`.

**`table`** — `{ head: [...], rows: [[...]], highlight?: {row?,col?}, caption? }` (≤ 5 columns, ≤ 6 rows).

**`anatomy`** — a string split into labelled parts, e.g. a URL, HTTP request line, JWT, `docker run` command: `{ parts: [{text, label, note, tone?}] }` (3–8 parts; `note` ≤ 20 words; the parts' `text` concatenated is the string).

**`anim` · `"engine": "topology"`** — boxes, links and moving packets: load balancers, replication, sharding, queues, pub/sub, microservices, API gateways, proxies, blue-green and rolling deploys, ECS/ECR, Docker networks. Two layouts.
- Tiers (default): `scenario`: `{ tiers: [[id…], …], nodes: {id: {label, sub?, kind?}}, links: [[from, to, {label?, dashed?, both?}?], …], groups?: [{label, nodes: [id…]}], steps: [{caption, send?: [{from, to, label?, tone?}], state?: {id: "up"|"down"|"busy"|"hot"|"stale"|"new"|"old"|"ok"}, badge?: {id: "short text"}, items?: {id: ["m1","m2"]}, label?: {id: "new label"}, focus?: [id…]}] }`. `kind` picks the icon: `client user server db lb queue cache gateway service proxy cloud box topic`. `tiers` are columns left to right (≤ 4 columns, ≤ 4 nodes per column, ≤ 8 nodes in all); a link that skips a column is drawn around the nodes between. `state`, `badge`, `items` and `label` are **cumulative**: set once, they stay until changed (`null` clears). `send` packets and `focus` apply to that one step. `tone` ∈ `req ok err info warn`. `groups` draw a dashed box around nodes (a cluster, a Docker host, a VPC). Badges ≤ 12 characters, items ≤ 8 characters and ≤ 6 per node.
- Hash ring: `{ layout: "ring", size: 100, rule?: "ring"|"mod", servers: {A: {at: 15}, B: {at: [40, 80]}}, keys: [{id: "k1", at: 5}, …], steps: [{caption, servers: ["A","B"], rule?, focus?: ["k3"]}] }`. The ENGINE computes who owns each key and how many moved: `ring` = first server clockwise from the key; `mod` = `key.at % number of servers`. A server with several `at` values has virtual nodes. ≤ 5 servers, ≤ 16 keys, positions 0 … size-1. Do not write counts or ownership in captions that the picture computes: say what to look at.

**`anim` · `"engine": "scrubber"`** — an exact little model you step through; `scenario.kind` picks which. Each is a pure function of the step.
- `"kind": "layers"` (Docker build cache): `{ kind: "layers", layers: [{cmd, cost?: seconds, watch?: [files]}] (3–10), steps: [{caption, edited: ["*initial*" | "src/app.js" | "line:3"]}] }`. `watch` lists the files a COPY depends on (`"*"` = any file, `"dir/"` = a folder). The engine applies Docker's real rule: a layer runs again if the cache is empty, a file it copies changed, its own line changed (`line:N`, 1-based), or any layer above it ran again.
- `"kind": "scan"` (full scan vs index): `{ kind: "scan", table?, column?, rows: [8–16 short unique values in table order], target: one of rows, steps: [{caption, mode: "seq", n: rows read} | {caption, mode: "index", n: 0–3}] }`. A sequential scan keeps reading to the end even after the match. The B-tree is built for you (4 keys per leaf, simplified): n=1 root, n=2 leaf, n=3 the table row.
- `"kind": "git"` (commit graph): `{ kind: "git", steps: [{caption, do: ["commit A", "checkout -b feature", "merge feature M", …]}] }`. Operations (replayed from the start, validated against real git): `commit <id>` · `branch <name>` · `checkout <name>` / `checkout -b <name>` / `switch -c <name>` · `merge [--no-ff] <name> [id]` (fast-forwards when git would) · `rebase <name>` (new commits get a prime: C → C′; old ones show faded as orphaned) · `reset <id>` · `cherry-pick <id> [newId]` · `tag <name>` · `push [branch]` · `remote-commit <id>` · `fetch` · `pull`. Commit ids are 1–3 characters and unique; ≤ 12 commits and ≤ 4 branches overall.
- `"kind": "jwt"` (a real HS256 token signed in the page with WebCrypto, plus a "Try it yourself" form): `{ kind: "jwt", secret: "demo-secret", payload: {≤ 6 claims}, steps: [{caption, view: "parts"|"decode"|"sign"|"tamper"|"resign", tamper?: {claim: newValue}}] }`. Use only obvious demo secrets.

**Which engine for what:** load balancing, replication, sharding, monolith vs microservices, gateway, queues and pub/sub, proxies, blue-green/rolling, ECS/ECR, Docker bridge/host networks → `topology` tiers · consistent hashing → `topology` ring · Docker layer cache and multi-stage build order → `scrubber` layers · why indexes help → `scrubber` scan · commits, branches, merge, rebase, push and pull → `scrubber` git · what a JWT is and why tampering fails → `scrubber` jwt.

## Role-play pages (kind `roleplay`) — only if your ids include one
`scenario` (brief, role, goal, rules, personaLabel, artifact, artifactTitle, artifactNote, rubric 6–8 criteria × 3 levels) in the page JSON, the artifact as `code[0]` (`run: "static"`), and a server-only key `content/roleplay/<id>.key.json` (`persona`, `setup`, `opening`, `hidden[]`, `flaws[]`). See `c04-t07`.

## Commands (run from the project root)
```
node tools/capture.mjs <id>          record real Node output for this page's runnable snippets
node tools/validate.mjs <id>         schema, word caps, code parse, cross-references, secrets
```
Do not run anything else: no `npm install`, no `git`, no servers, no network calls. Do not read `.env`.
