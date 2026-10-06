# BackendEngineer — a living book

A book-style backend engineering course that runs on your own computer. Short, crisp pages you can **read, run and watch**, with a **DeepSeek tutor on every page that already knows what you are looking at**. Everything you ask, write and finish is saved locally.

From JavaScript fundamentals, through Node.js, HTTP, Express, SQL and MongoDB, authentication, Docker and AWS, to system design and Git: 15 chapters, 197 pages.

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
| `npm test` | 64+ tests: security guards, streaming, durable storage, prompt assembly (fake DeepSeek), and the animation engines checked against real git and `jsonwebtoken` |
| `npm run validate` | Check every written page: structure, "short and crisp" word caps, code, secrets |
| `npm run examples:install` | Install the libraries the examples import (Express, Drizzle, Mongoose, Zod…) into `content/code/`. Only needed to re-run `capture`; reading the book needs nothing |
| `npm run capture` | Run every runnable example for real (Node, real PostgreSQL and MongoDB, real `git`) and record its output. Each runs twice and must print the same both times |
| `npm run qa:shots` | Screenshot pages with your Chrome (`-- --auto` visits every frame) |
| `npm run e2e` | Drive a real browser through the whole app, including real tutor calls (`-- --no-chat` skips those) |
| `npm run e2e:challenges` | Drive the in-page coding challenges: failing starter, passing solution, hints, reveal, saved progress |
| `npm run smoke:chat` | One real round-trip to DeepSeek with the key in `.env` |
| `npm run scan` | Pre-commit scan of exactly the files git would commit: secrets, tokens, personal data, gitleaks |
| `npm run contrast` | WCAG contrast + sRGB gamut lint for every chapter colour, light and dark |
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
| `T` `C` `N` | Contents · Tutor · Notes |
| `⌘↵` / `Ctrl ↵` | Run the code in the editor |
| `?` | All shortcuts and display options |

Select any text on a page and choose **Ask about this** to put it in front of the tutor.

## What is where

```
server/     Express 5 server: content API, tutor relay (SSE), saved chats, notes, progress
public/     the book: vanilla ES modules, no build step; vendored Prism, markdown-it and fonts
content/    syllabus.json · one JSON per page · real code files · role-play keys (server-only)
tools/      validate · capture · qa-shots · e2e · smoke-chat · build-vendor · in-browser runner shims
test/       node --test suites + a fake DeepSeek server
data/       YOUR chats, notes and progress (gitignored — personal, never committed)
```

### The tutor

The server builds each prompt from the page you are on (idea, points, animation steps, code and its real output, pitfalls, quiz, neighbours) plus what you are doing right now (frame, step, the code you edited, the last error). The browser never sees your API key. Role-play pages keep their persona and answer key on the server only. Model: `deepseek-flash` with thinking switched off (the API default is thinking **on**), configurable with `DEEPSEEK_MODEL`.

### Your data

`data/chats/<page>.json` (threads of messages), `data/notes/<page>.json`, `data/progress.json`, `data/usage.json` (a daily token counter with a cap, `DAILY_TOKEN_CAP`). Writes are atomic and keep a `.bak`; `data/.backups/` holds seven daily copies. Export all chats as Markdown from **Saved chats**.

### Living notes

Pages with **Live** code are editable and run in your browser, inside a sandboxed iframe and a throwaway Worker with a time limit; `events`, `buffer`, `path`, `util`, an in-memory `fs` and Node-style `console.log` output are provided. The build verifies that what the browser prints matches what real Node prints. Examples that need real tools (Express, `http`, `nextTick` ordering, PostgreSQL, MongoDB, `git`) show **Real output**, recorded from a real run while the book was built, with the tool and version in the badge. Docker, AWS and cloud consoles cannot run here, so they are labelled **Illustrative**.

**Challenge** pages give you starter code and tests in the page: write the function, press ⌘↵, read which tests fail, open a hint, and only then reveal the solution. The build proves that every solution passes its tests and every starter fails them.

**Animations** include a hash ring where the engine computes which server owns each key, a network topology with moving packets, the Docker layer cache, an index-versus-scan comparison, a git commit graph (its operations are checked against real `git` in the tests) and a JWT whose signature is computed live in your browser.

### Security notes

The server binds to `127.0.0.1`, answers only for `localhost`/`127.0.0.1`/`[::1]` Host headers (DNS-rebinding guard), requires our own `Origin` and JSON for every state-changing request, serves only `public/`, validates every id, caps body sizes and request rates, and has no endpoint that executes code. Model output is rendered through markdown-it with raw HTML disabled; images are dropped. A strict Content-Security-Policy applies, with a separate one for the code-runner page. `.env`, `data/` and `.claude/` are gitignored.

---
The syllabus follows a public Node.js backend course outline; every explanation, example and animation here is original.
