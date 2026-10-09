# Low-Level Design — rules for this book

Read `content/_style/STYLE.md` and `content/_style/AUTHORING.md` first. This file adds what is specific to **Low-Level Design** (`low-level-design`). Where it differs from STYLE.md, this file wins for this book.

## Who it is for
a backend engineer who knows JavaScript and wants to design clean, extensible classes and ace LLD interviews. Write for that reader: say what they already know, and never assume more.

## What the examples run on
Profile: `js`.
Examples are JavaScript for **Node 20.20**, as ES modules (`.mjs`). `run: "browser"` for pure JavaScript, `"captured"` when real Node is needed.
Do not use: `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers`, `Array.fromAsync`, `fs.glob`, `new WebSocket` (missing from Node 20).
Exact toolchain versions are in `versions.json`. State only what is true for those versions; for anything else say only what is stable.

## Accuracy
- Cover the heading the learner gave. If a heading is broader than one page can hold, teach the core idea and leave the rest to the tutor.
- A wrong page is worse than a short one: omit anything you are not sure of.
- No invented statistics, prices, limits, dates, quotes or case studies.

## Terms and spellings
- **low-level design (LLD)** and **high-level design (HLD)**: lower case in running text, "LLD"/"HLD" after the first use on a page; capitalise only at the start of a sentence or in a title.
- SOLID principles, sentence case, with the abbreviation after the first use: **Single responsibility (SRP)**, **Open/closed (OCP)**, **Liskov substitution (LSP)**, **Interface segregation (ISP)**, **Dependency inversion (DIP)**. "SOLID" is always upper case.
- **dependency injection (DI)**, **inversion of control (IoC)**: lower case in running text.
- Pattern names: capitalised name + lower-case "pattern": **Factory pattern**, **Abstract Factory**, **Chain of Responsibility**, **Template Method**, **Object Pool**. Name the Gang of Four categories **creational**, **structural**, **behavioural** (British spelling throughout: behaviour, colour).
- **is-a** / **has-a** (hyphenated, lower case); **composition over inheritance**.
- **UML**, **class diagram**, **sequence diagram** (lower case "diagram").
- Code: classes PascalCase, methods and fields camelCase, private state with `#field`, interfaces shown as a JSDoc `@interface` comment or a base class that throws "not implemented". One class per concept; no TypeScript.

## Exemplar pages
- `c01-t02` SOLID Principles: a deep page (analogy, animation, before/after code for each principle). Model for every depth-3 page and every pattern page.
- `c01-t03` Object-Oriented Programming Refresher: a normal page with two short runnable snippets. Model for depth-2 pages.
- `c01-t01` Introduction to LLD: a short depth-1 page. Model for the project, review and career pages.

## Shared running examples
- **Capstone (c05, all 13 pages) is ONE system: a Meeting Room Booking System.** Core classes, spelled exactly: `Building`, `Room`, `Employee`, `Booking`, `BookingService`, `RoomRepository`, `BookingRepository`, `NotificationService`, `ConflictPolicy` (strategy for overlap rules), `AuditLogger`. Requirements: search free rooms by capacity and time slot, book/cancel, no double booking (overlap check), recurring bookings as a stretch goal, notify attendees. Each capstone page builds on the previous one's classes; do not rename them.
- c03-t13 (mid-course project) lets the learner pick from the c03 systems and gives a reusable checklist; it does not design a new system.
- **No backticks inside `table` hero cells or `head`**: table cells render as plain text, so backticks show literally. Write `Invoice class`, not `` `Invoice` ``.
