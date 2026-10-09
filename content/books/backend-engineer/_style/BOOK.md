# Backend Engineering — rules for this book

Read `content/_style/STYLE.md` and `content/_style/AUTHORING.md` first. This file adds what is specific to **Backend Engineering** (`backend-engineer`). Where it differs from STYLE.md, this file wins for this book.

## Who it is for
An adult who knows basic programming but is new to backend work. The book takes them from JavaScript fundamentals to production backends: Node.js, Express, SQL/Postgres/Drizzle, MongoDB, authentication, Docker, AWS, system design and Git.

## What the examples run on
Profile: `js`. Examples are JavaScript for **Node 20.20**, as ES modules (file extension `.mjs`; `.cjs` only when CommonJS is the lesson). `run: "browser"` for pure JavaScript, `"captured"` when real Node is needed (`http`, Express, real `fs`, `crypto`, `child_process`, `nextTick` ordering). Shell transcripts (`.sh`) show real `git` and shell sessions.
Do not use `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers`, `Array.fromAsync`, `fs.glob`, `new WebSocket` (missing from Node 20).

## Accuracy: pinned versions
**Node 20.20**, **Express 5.2** (`app.get('*')` is invalid; `req.body` is `undefined` until a body parser runs), npm 10. Library versions are in `versions.json`. For anything else say only what is stable across versions.
Topics this book cannot run for real (Docker, AWS) are `static` + `illustrative: true` with commands limited to flags you are certain exist. PostgreSQL 18 and MongoDB 8.2 can run for real through `"needs"` (see AUTHORING.md).
Libraries installed for examples (`content/books/node_modules`): `pg`, `drizzle-orm`, `mongoose`, `zod`, `jsonwebtoken`, `bcryptjs`, `express`, `nanoid`, `cookie-parser`, `cors`, `helmet`, `dotenv`, `morgan`, `express-session`, `express-validator`, `nodemailer`, `mailgen`, `ejs`.

## Terms and spellings
JavaScript · Node.js · npm · Express · PostgreSQL ("Postgres" is fine) · MongoDB · Mongoose · Drizzle ORM · JWT · REST · API · HTTP · URL · JSON · Docker · Dockerfile · `package.json` · middleware · callback · async/await · event loop · "log in" (verb) / "login" (noun).

## Exemplar pages
- `c02/c02-t09.json` — animation hero (lanes), browser + captured code, output quiz.
- `c04/c04-t08.json` — pipeline animation, real Express example with a walk.
- `c09/c09-t10.json` — compare hero, static Dockerfile with a walk.
- `c02/c02-t11.json` — flow hero, one editable snippet.
- `c01/c01-t07.json` — a challenge page (in-browser tests); `c04/c04-t07.json` — a role-play page.
