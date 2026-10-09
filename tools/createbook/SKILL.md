---
name: 786createbook
description: This skill should be used when the user says "786CreateBook" or "/786createbook", or asks to create, extend or continue a book in their living library ("make me a book on …", "here are the topics and headings, build the book", "add these chapters to the book", "continue the unfinished book"). Takes the user's topics and headings and builds a complete book INSIDE the existing BackendEngineer project (never a new repo): chapters, pages with animations, real recorded code runs, quizzes and a per-page AI tutor, parallel author/clarity/technical review, full validation, then one local commit. The book appears in the library UI at localhost:4000 next to the others.
version: 1.0.0
---

# 786CreateBook

Builds a book "in the same fashion as Backend Engineering": short pages (idea → how it works → code → watch out and check), animated visuals, code that really ran, a tutor on every page that knows the page, saved chats and notes, progress. All books live in ONE project and one repo; the UI has a library at `/` and each book at `/b/<slug>`.

- Project: `{{PROJECT}}`. Every command below runs from there (`cd` first, use absolute paths).
- A book is the folder `content/books/<slug>/`. Nothing else is created. **Never create another repo or another project.**
- The tools are versioned in the project under `tools/createbook/` (this file is the installed copy of `tools/createbook/SKILL.md`).

## What the user provides
Free-form: a subject, topics and headings, usually grouped. Optional: title, who it is for, language to teach in, how many pages, "continue <slug>" or "add to <slug>". Do not interrogate the user: take sensible defaults and say what you chose. Only ask if you cannot tell what the book is about.

Modes:
1. **New book** (default): steps 0 to 6.
2. **Add chapters to a book**: the user names an existing book and gives more topics. Outline contains only the NEW chapters; scaffold with `--append`; then steps 3 to 6 for the new pages only (skip the pilot).
3. **Continue**: the user says to continue a book that stopped half way. Skip steps 1 and 2: `node tools/createbook/plan.mjs <slug>` lists what is unwritten; then steps 3 to 6.

## Step 0 — Look around (read-only)
```
cd "{{PROJECT}}" && git status --short | head -20 && ls content/books
curl -s localhost:4000/api/health          # is the server up? (it picks up new books by itself within seconds)
```
Note any uncommitted changes that are not yours: leave them alone and never commit them. For a Python, Java or C book check the toolchain exists (`python3 --version`, `java -version`, `cc --version`); the scaffold records the versions. If a toolchain is missing, use profile `none` (snippets become `static`, illustrative) and tell the user.

## Step 1 — Turn the topics into an outline, then scaffold
Write the outline to `{{PROJECT}}/.tmp/outlines/<slug>.json` (`.tmp/` is git-ignored). The format is `content/_schema/outline.schema.json`; the rules:
- **Keep the user's headings.** One heading = one page, in the user's order and grouping. Never drop, merge or reorder them, and do not add pages they did not ask for. If a heading is really two ideas, keep it as one page and mention it at the end.
- If the user gave no grouping, group into chapters of 4 to 12 pages with a short title, a one-line `tagline` and 2 to 5 `outcomes` ("Run a script", "Read an error message": what the learner can DO afterwards). Every chapter needs both.
- If the user gave only a subject and no headings, propose chapters and headings yourself (a whole book is usually 30 to 120 pages; above ~150 suggest two books).
- `slug`: lowercase letters, digits, dashes, at most 40 characters, from the title. `title` at most 80 characters. `audience`: the user's words, else "an adult new to <subject>".
- `profile` = what runs for real: `js` (Node), `python`, `java`, `c`, `mixed` (several), or `none` (concepts only, no code run). Pick from what is taught.
- `depth` per page: 1 = a quick idea or definition, 2 = a normal page (the default), 3 = a deep page that needs an analogy and a strong animation: the core mechanisms, about a quarter of the book.
- `kind`: `lecture` unless the user asks otherwise. `roleplay` only on request. `challenge` (in-browser coding tests) only on request and only in `js`/`mixed` books; the scaffold refuses it elsewhere.
- `tutor`: `name` (the book's title is fine), `about` (one sentence: what the book teaches and to whom), `examples` (languages/tools it uses), `learnerRole`, `mentorRole`. For `js` books add `runtime.bannedApis` (the list in `content/books/backend-engineer/book.json`).
- Leave `hue`, `order` and `monogram` out: the scaffold picks a colour far from the other books and puts the book last on the shelf.

Then:
```
node tools/createbook/new-book.mjs .tmp/outlines/<slug>.json --dry-run   # check, write nothing
node tools/createbook/new-book.mjs .tmp/outlines/<slug>.json             # create (add --append for mode 2)
node tools/validate.mjs --book <slug>                                     # must be clean: 0 pages written, N to go
```
It refuses if the book exists (exit 2): then pick another slug, or use `--append` only if the user is adding chapters.

## Step 2 — Pilot: three sample pages, then the ONE pause
```
node tools/createbook/plan.mjs <slug> --pilot            # prints the batch JSON for 3 pages that show the range of the book
```
Run the **Workflow** tool with `scriptPath: "{{PROJECT}}/tools/createbook/author-workflow.js"` and `args`:
```
{ "slug": "<slug>", "root": "{{PROJECT}}", "title": "<book title>", "profile": "<profile>", "audience": "<audience>", "batches": <the "batches" array printed by plan.mjs> }
```
The user asked for whole books to be built this way, so this skill authorises the Workflow tool and the usual "keep workflows under 10 agents" guideline does not apply here. The workflow writes each batch (author), has a clarity reviewer and a technical reviewer read it independently, applies their findings, and finishes with a book-level cross-check.

When it returns:
1. `node tools/validate.mjs --book <slug>` and `node tools/capture.mjs --book <slug>` must pass (capture runs every snippet twice and fails on any difference). Fix what is left yourself.
2. Fill in `content/books/<slug>/_style/BOOK.md`: "Terms and spellings" (the exact spelling of the key terms as the pilot pages use them) and "Exemplar pages" (the 2 to 4 best pilot pages). Later authors imitate these.
3. Look at one pilot page in a browser: `node tools/qa-shots.mjs --book <slug> --auto --only <id>` writes screenshots to `qa/shots/`; Read two or three (an animation frame and a code frame). Fix anything ugly.
4. **Pause here, once.** Tell the user, briefly: the outline (chapters and page counts), the links `http://localhost:4000/b/<slug>/read/<id>` for the 3 sample pages, and ask whether to write the remaining pages or what to change. Apply any requested change to the pilot pages and BOOK.md first. If the user rejects the outline, delete the new folder (`rm -r content/books/<slug>`, it is uncommitted) and redo steps 1 and 2. After the user says go, do **not** pause again until the report.

## Step 3 — Write the rest
```
node tools/createbook/plan.mjs <slug> --size 5           # every page not written yet, in batches of about 5, never across chapters
```
Run the Workflow tool again with the same `scriptPath` and `args` (the new `batches`). For more than 25 batches, split into several runs of up to 25 so each is reviewable. If a run is interrupted, run `plan.mjs` again: it only plans pages that are not written. Read the result: `unresolved`, `authorProblems`, `batchesLost`, `crossCheck`. Re-plan and re-run for anything missing (at most twice), then fix the last few by hand.

## Step 4 — Verify (never skip, never claim what you did not see)
All of these must pass:
```
node tools/validate.mjs --book <slug>                    # 0 errors, 0 warnings, coverage N/N
node tools/capture.mjs --book <slug>                     # every snippet runs twice, identical output
node tools/check-contrast.mjs                            # the book's colours are readable
npm test                                                 # the platform still passes
node tools/qa-shots.mjs --book <slug> --auto --check-only --sizes 1280x720      # every frame of every page: no console errors, nothing overflows
node tools/e2e-library.mjs                               # the library UI still works
npm run scan                                             # no secrets, before committing
```
Then spot-check three or four pages visually (`qa-shots --book <slug> --auto --only <id>`, Read the PNGs in `qa/shots/`), including one in dark mode (`--themes dark`). Fix problems and re-run the failing check.

## Step 5 — Commit (local only, one commit per book)
```
git add content/books/<slug>          # plus content/books/package.json and package-lock.json if a library was added, plus any platform file you changed on purpose
git commit                            # "Add book: <title> (<N> pages)" + the attribution trailer given by the environment
```
Never `git add -A` or `git add .`; never add `data/`, `.env`, `qa/` or `.tmp/`. **Do not push.** If the user wants it on GitHub, tell them to run `npm run publish:github` (their own step, with their own token).

## Step 6 — Report (short)
The link (`http://localhost:4000/b/<slug>`; the library is `http://localhost:4000/`), chapters and pages, which snippets are illustrative and why, any finding left unresolved, how to add chapters or continue (`/786createbook add to <slug>: …`). If `/api/health` says the tutor is unavailable, say the DeepSeek key in `.env` needs fixing (never read or print the key).

## Rules
- Original content only: write every explanation and example fresh; never reproduce a course's wording, and never invent statistics, quotes, prices or case studies.
- Never touch another book's pages. Never edit `content/_style`, `content/_schema` or the platform code as part of building a book (if a real limitation blocks the book, stop and tell the user).
- Never read, print or commit `.env` or any key or token.
- Stay token-efficient but never lower the bar: do not re-read pages the workflow just wrote (the validators and the spot-check are the check), and do not skip the reviewers.
- If anything fails twice in the same way, stop and report what you saw instead of working around it.
