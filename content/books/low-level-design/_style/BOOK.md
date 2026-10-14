# Low-Level Design — rules for this book

Read `content/_style/STYLE.md` and `content/_style/AUTHORING.md` first. This file adds what is specific to **Low-Level Design** (`low-level-design`). Where it differs from STYLE.md, this file wins for this book.

## Who it is for
a backend engineer who knows basic Java and wants to design clean, extensible classes and ace LLD interviews. Write for that reader: say what they already know, and never assume more.

## What the examples run on
Profile: `java`. **Java is the reference language of this book**: every example, quiz snippet, hero code panel and tutor answer uses Java.
- Examples are **Java 17**, one source file each, `run: "captured"`, run as `java File.java` (single-file source mode; JDK only, no build tool).
- **The file name must equal its public class** (`ParkingLotDemo.java` holds `public class ParkingLotDemo`), and that FIRST class holds `public static void main(String[] args)`. Other types in the same file (interfaces, abstract classes, enums, records, helpers) are package-private (no `public`). Each snippet file in a page has a distinct name.
- Java 17 only: records, enums, interfaces with default/static methods, sealed interfaces, `switch` expressions with `->`, text blocks, `var`. NOT in 17: pattern matching in `switch` (preview), record patterns, virtual threads, `SequencedCollection`, string templates. Lines <= 80 columns.
- Output must be identical on every run: never print `HashMap`/`HashSet` iteration order (use `LinkedHashMap`, `TreeMap`, or sort), timestamps, unseeded randoms (`new Random(42)` is fine), thread interleavings, or default `toString`/`hashCode`. Concurrency demos `join()` threads or `awaitTermination` and print only deterministic results.
- Use Java's real features: `interface` / `abstract class` for contracts, `private final` fields, constructor injection, `enum` for states and types, `record` for value objects, checked vs unchecked exceptions, `synchronized` / `ReentrantLock` / `ConcurrentHashMap` / `AtomicInteger`, `Iterator`/`Iterable`, `Optional`, `Objects.requireNonNull`, `List.copyOf`.
- Testing pages: JUnit is not available, so use a tiny hand-written `check(name, condition)` runner in plain Java; name JUnit 5 and Mockito as what teams use (an illustrative `static` JUnit snippet is allowed, `illustrative: true`).
- Diagrams as code: Mermaid text, `lang: "text"`, `run: "static"`, `illustrative: true`.

## Depth and detail (the learner asked for a detailed, production-quality book)
The page format is short by design, so detail comes from **density, not length**. Every page must feel like a senior engineer explaining it, not a summary:
- **Two code examples on every depth-2 and depth-3 page**: usually "the problem" (naive or violating code, with its real bad output) and "the fix" (production-quality version), or "core mechanism" plus "edge case / failure handled". Each file 20 to 60 lines, with a `walk` of 4 to 7 steps that explains the WHY of each part.
- Production quality in every snippet: validate inputs (`Objects.requireNonNull`, `IllegalArgumentException` with a clear message), immutability where possible, no public mutable fields, meaningful names, no god classes, thread-safety stated when relevant.
- `points` must carry real information: the mechanism, when to use it, the trade-off, how it shows up in an interview. No filler sentences.
- The `hero` must show the mechanism step by step (anim/flow/seq with 4 to 8 steps), not decoration. Class-structure pages use a flow hero as a class diagram (nodes = classes with key members in `sub`).
- Pitfalls are concrete mistakes seen in real code reviews or interviews, each naming the symptom.
- Quizzes test understanding: predict the output of tricky code, or pick the right design for a scenario with plausible wrong answers.
- Pattern pages always answer: intent, the problem without it, structure (participants), Java implementation, a real-world use in the JDK or common frameworks (only ones you are sure of, e.g. `java.util.Iterator`, `Collections.unmodifiableList` as a proxy-like wrapper, `Runtime.getRuntime()`, `StringBuilder` builder-like API, `java.io` decorators like `BufferedReader`), and when NOT to use it.

## Accuracy
- Cover the heading the learner gave, deeply. If a heading is broader than one page, teach its core thoroughly and let the tutor take the rest.
- A wrong page is worse than a short one. Every behaviour claim about Java must be proven by the captured output or be standard, stable Java 17 behaviour.
- No invented statistics, prices, limits, dates, quotes or case studies.

## Terms and spellings
- **low-level design (LLD)** and **high-level design (HLD)**: lower case in running text, abbreviation after the first use on a page.
- SOLID: **Single Responsibility Principle (SRP)**, **Open/Closed Principle (OCP)**, **Liskov Substitution Principle (LSP)**, **Interface Segregation Principle (ISP)**, **Dependency Inversion Principle (DIP)**.
- **dependency injection (DI)**, **inversion of control (IoC)**: lower case in running text.
- Pattern names capitalised + lower-case "pattern": **Factory Method pattern**, **Abstract Factory**, **Chain of Responsibility**, **Template Method**, **Object Pool**. Gang of Four categories: **creational**, **structural**, **behavioural** (British spelling throughout: behaviour, colour).
- **is-a** / **has-a**; **composition over inheritance**; **UML**, **class diagram**, **sequence diagram**.
- Code: standard Java conventions; interfaces named for the role (`PaymentMethod`), never `IPaymentMethod`.
- **Inline code in `points`, `pitfalls`, `idea` and captions: at most 24 characters per backtick span** (a class or method name, not an expression). Long inline code cannot wrap and overflows the 4-column points layout. Put expressions in the code examples instead.
- **No backticks inside `table` hero cells or `head`** (they render as plain text).

## Exemplar pages
- `c03-t02` Single Responsibility Principle: the model for every principle page: a broken "god class" with its real bad output, then the fix split by actor, a 6-step walk.
- `c07-t04` Decorator Pattern: the model for every pattern page: "the problem" (subclass explosion) and "the fix" (wrappers), a pipeline animation of one call through the wrappers, a JDK example, when not to use it.
- `c10-t17` Locks, Atomics and Concurrent Collections: the model for any page with threads (deterministic output, lock ordering, atomics).

## Shared running examples and boundaries
- Chapters: c01 Foundations, c02 OOP, c03 SOLID, c04 UML, c05 Robust code + DI, c06 Creational, c07 Structural, c08 Behavioural, c09 Classic case studies, c10 Advanced principles, c11 Capstone, c12 Interviews.
- **One pattern per page in c06-c08.** Do not re-teach a pattern on another page; link back by naming it ("the Strategy pattern from c08").
- c08's last page (Notification System) combines Factory, Strategy, Observer, Decorator and Chain of Responsibility from earlier pages.
- c09 covers Tic-Tac-Toe, Splitwise, Cab booking and Food delivery only. Parking lot, elevator, movie/hotel booking, cart, rate limiter, cache and logger live in the separate **LLD Case Studies** book; c09 pages may mention that.
- **Capstone (c11, all 13 pages) is ONE system: a Meeting Room Booking System.** Classes, spelled exactly: `Building`, `Room`, `Employee`, `Booking`, `BookingService`, `RoomRepository`, `BookingRepository`, `ConflictPolicy` (strategy), `BookingListener` (observer) implemented by `NotificationService` and `AuditLogger`. API: `searchFree(int capacity, double start, double end)`, `book(String employeeId, String roomId, double start, double end)`, `cancel(String bookingId, String employeeId)` (only the owner may cancel); hours as `double` (9.5 = 09:30); unchecked `BookingException` subclasses `RoomTakenException`, `InvalidSlotException`, `NotOwnerException`, each with a stable `code()` ("ROOM_TAKEN", "INVALID_SLOT", "NOT_OWNER"); `ConflictPolicy.conflicts(Booking candidate, List<Booking> existing)`; `BookingRepository` with `save`, `findById`, `forRoom`, `remove`. Each capstone page builds on these; never rename them.
- Concurrency pages (c10) use non-booking examples (counters, stock, bank transfer, job queue) so they do not repeat c09/c11.
