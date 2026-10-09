# Living library — books you can read, run and ask

A shelf of book-style courses that runs on your own computer. Short, crisp pages you can **read, run and watch**, with a **DeepSeek tutor on every page that already knows what you are looking at**. Everything you ask, write and finish is saved locally, separately for each book.

Open http://localhost:4000 and pick a book from the library (or use the switcher at the top of the contents, or press `B`). The first book is **Backend Engineering**: JavaScript fundamentals, Node.js, HTTP, Express, SQL and MongoDB, authentication, Docker and AWS, system design and Git: 15 chapters, 197 pages. Every book has its own address, `/b/<book>`.

## Add a book

In Claude Code, in this project, run the skill and give it your topics and headings:

```
/786createbook  Python for beginners. Chapters: 1 Getting started (what Python is, variables, printing) · 2 Control flow (if, loops) · …
```

It adds a book **to this same project** (never a new repo): it builds the outline, writes three sample pages and stops once for your OK, then writes every page (animations, code that really ran, quizzes, tutor context), has each batch read by a clarity reviewer and a technical reviewer, validates everything and makes one local commit. Publishing stays your call (`npm run publish:github`). `node tools/createbook/install-skill.mjs` (or `npm run skill:install`) installs the skill from `tools/createbook/SKILL.md` into `~/.claude/skills/`.

Books can run **JavaScript/Node**, **Python**, **Java** (one source file) and **C** for real (the output you see is recorded from a real run, with the tool's version in the badge), or be concept-only with diagrams and animations. Other languages are shown with syntax highlighting and marked illustrative.

## Run it

```bash
npm install
cp .env.example .env        # then put your DeepSeek key in .env
npm start                   # → http://localhost:4000
```

`npm run dev` restarts the server when server files change. Page content reloads without a restart.

| Command | What it does |
|---|---|
| `npm start` | Serve the book on http://localhost:4000 (loopback only) |
| `npm test` | 100 tests: security guards, streaming, durable storage, prompt assembly (fake DeepSeek), the library (books never leak into each other, data migration), the book scaffold tools, and the animation engines checked against real git and `jsonwebtoken` |
| `npm run validate` | Check every written page of every book (`-- --book <slug>` for one): structure, "short and crisp" word caps, code, secrets |
| `npm run examples:install` | Install the libraries the examples import (Express, Drizzle, Mongoose, Zod…) into `content/books/` (shared by every book). Only needed to re-run `capture`; reading the book needs nothing |
| `npm run capture` | Run every runnable example for real (Node, Python, Java, C, real PostgreSQL and MongoDB, real `git`) and record its output. Each runs twice and must print the same both times |
| `npm run qa:shots` | Screenshot pages with your Chrome (`-- --auto` visits every frame) |
| `npm run e2e` | Drive a real browser through the whole app, including real tutor calls (`-- --no-chat` skips those) |
| `npm run e2e:library` | Drive the library in a real browser on a throwaway server: covers, switching books, old URLs, per-book saved data, a Python page, a phone |
| `npm run e2e:challenges` | Drive the in-page coding challenges: failing starter, passing solution, hints, reveal, saved progress |
| `npm run smoke:chat` | One real round-trip to DeepSeek with the key in `.env` |
| `npm run scan` | Pre-commit scan of exactly the files git would commit: secrets, tokens, personal data, gitleaks |
| `npm run publish:github` | Create (if needed) a PRIVATE GitHub repo and push, using a token you type at a hidden prompt or pass as `GITHUB_TOKEN`. It checks the token's owner, scans for the token, and never stores it |
| `npm run book:new` / `book:plan` | The scaffold and batch planner behind the skill (`-- <outline.json>`, `-- <slug> --pilot`) |
| `npm run contrast` | WCAG contrast + sRGB gamut lint for every book and chapter colour, light and dark |
| `npm run build:vendor` | Rebuild the vendored libraries, fonts and code-runner shims |

## How to read it

Each page is one idea in up to four short frames: **Core idea → How it works → In code → Watch out · Check**.

| Key | Action |
|---|---|
| `→` / `Space` | Step the animation, then the next frame (the last frame opens an end card) |
| `←` | Step back |
| `PgUp` / `PgDn` | Previous / next frame |
| `[` `]` | Previous / next page |
| `P` | Play or pause the animation |
| `1`–`4` | Answer the quiz |
| `⌘K` / `Ctrl K` | Search pages and saved chats |
| `T` `B` `C` `N` | Contents · Switch book · Tutor · Notes |
| `⌘↵` / `Ctrl ↵` | Run the code in the editor |
| `?` | All shortcuts and display options |

Select any text on a page and choose **Ask about this** to put it in front of the tutor.

## What is where

```
server/     Express 5 server: library, content API, tutor relay (SSE), saved chats, notes, progress
public/     the app: vanilla ES modules, no build step; vendored Prism, markdown-it and fonts
content/    _schema/ and _style/ (shared) · books/<slug>/ = book.json · syllabus.json · one JSON per page · real code files · role-play keys (server-only)
tools/      validate · capture · qa-shots · e2e · smoke-chat · build-vendor · createbook/ (the skill's scaffold, planner and workflow)
test/       node --test suites + a fake DeepSeek server
data/       YOUR chats, notes and progress, one folder per book (gitignored — personal, never committed)
```

### The tutor

The server builds each prompt from the page you are on (idea, points, animation steps, code and its real output, pitfalls, quiz, neighbours) plus what you are doing right now (frame, step, the code you edited, the last error). The browser never sees your API key. Role-play pages keep their persona and answer key on the server only. Model: `deepseek-flash` with thinking switched off (the API default is thinking **on**), configurable with `DEEPSEEK_MODEL`.

### Your data

`data/books/<book>/chats/<page>.json` (threads of messages), `data/books/<book>/notes/<page>.json`, `data/books/<book>/progress.json`, and one shared `data/usage.json` (a daily token counter with a cap, `DAILY_TOKEN_CAP`). Data saved by the original single-book layout is moved into `data/books/backend-engineer/` the first time the server starts: every file is copied, checked byte for byte and snapshotted into `data/.backups/pre-library-…/` before the originals are removed. Writes are atomic and keep a `.bak`; `data/.backups/` holds seven daily copies. Export all chats as Markdown from **Saved chats**.

### Living notes

Pages with **Live** code are editable and run in your browser, inside a sandboxed iframe and a throwaway Worker with a time limit; `events`, `buffer`, `path`, `util`, an in-memory `fs` and Node-style `console.log` output are provided. The build verifies that what the browser prints matches what real Node prints. Examples that need real tools (Express, `http`, `nextTick` ordering, PostgreSQL, MongoDB, `git`) show **Real output**, recorded from a real run while the book was built, with the tool and version in the badge. Docker, AWS and cloud consoles cannot run here, so they are labelled **Illustrative**.

**Challenge** pages give you starter code and tests in the page: write the function, press ⌘↵, read which tests fail, open a hint, and only then reveal the solution. The build proves that every solution passes its tests and every starter fails them.

**Animations** include a hash ring where the engine computes which server owns each key, a network topology with moving packets, the Docker layer cache, an index-versus-scan comparison, a git commit graph (its operations are checked against real `git` in the tests) and a JWT whose signature is computed live in your browser.

### Security notes

The server binds to `127.0.0.1`, answers only for `localhost`/`127.0.0.1`/`[::1]` Host headers (DNS-rebinding guard), requires our own `Origin` and JSON for every state-changing request, serves only `public/`, validates every id, caps body sizes and request rates, and has no endpoint that executes code. Model output is rendered through markdown-it with raw HTML disabled; images are dropped. A strict Content-Security-Policy applies, with a separate one for the code-runner page. `.env`, `data/` and `.claude/` are gitignored.

---
The first book's syllabus follows a public Node.js backend course outline; every explanation, example and animation here is original.
