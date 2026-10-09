# Low-Level Design — rules for this book

Read `content/_style/STYLE.md` and `content/_style/AUTHORING.md` first. This file adds what is specific to **Low-Level Design** (`low-level-design`). Where it differs from STYLE.md, this file wins for this book.

## Who it is for
a backend engineer who knows basic Java and wants to design clean, extensible classes and ace LLD interviews. Write for that reader: say what they already know, and never assume more.

## What the examples run on
Profile: `java`. **Java is the reference language of this book**: every example, quiz snippet, hero code panel and tutor answer uses Java.
- Examples are **Java 17.0.11**, one source file each, `run: "captured"`, run as `java File.java` (single-file source mode; no build tool, no libraries beyond the JDK).
- **The file name must equal its public class** (`ParkingLotDemo.java` holds `public class ParkingLotDemo`), and that FIRST class holds `public static void main(String[] args)`. Other types in the same file (interfaces, abstract classes, enums, records, helper classes) are package-private (no `public`). Each snippet file in a page has a distinct name.
- Java 17 only: records, enums, interfaces with default methods, sealed interfaces, `switch` expressions with `->`, text blocks, `var`. NOT available in 17: pattern matching in `switch` (preview), record patterns, virtual threads, `SequencedCollection`, string templates. Lines <= 80 columns; keep each file short (<= 45 lines) and focused on one idea.
- Output must be identical on every run: no `HashMap`/`HashSet` iteration order in output (use `LinkedHashMap`, `TreeMap`, or sort), no timestamps, random numbers (unless `new Random(42)`), thread interleavings or `hashCode`/default `toString` output. Concurrency demos `join()` their threads or `awaitTermination` and print only deterministic results (final counts, booleans).
- Use Java's real features to teach the concepts: `interface` and `abstract class` for contracts, `private final` fields, constructor injection, `enum` for states and types, `record` for value objects, checked vs unchecked exceptions, `synchronized`/`ReentrantLock`/`ConcurrentHashMap`/`AtomicInteger` for concurrency, `Iterator`/`Iterable`, `Cloneable` vs copy constructors, `Optional`.
- Unit-testing pages: JUnit is not available, so show a tiny hand-written `check(name, condition)` runner in plain Java, and mention JUnit 5 and Mockito by name as what teams use (an illustrative `static` JUnit snippet is allowed, marked `illustrative: true`).
- Diagrams: Mermaid/PlantUML text as `lang: "text"`, `run: "static"`, `illustrative: true`.
Exact toolchain versions are in `versions.json`. State only what is true for Java 17.

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
- Code: standard Java conventions: classes/interfaces PascalCase, methods and fields camelCase, constants UPPER_SNAKE_CASE, fields `private final` where possible, interfaces named for the role (`PaymentMethod`, `ConflictPolicy`), never `IPaymentMethod`.

## Exemplar pages
- `c02-t09` Observer & Strategy: a deep pattern page (analogy, animation, one runnable Java file per pattern). Model for every pattern and depth-3 page.
- `c04-t10` Designing for Concurrency: deterministic Java concurrency (`ExecutorService` + `awaitTermination`, `join`, sorted `TreeMap` snapshot, lock ordering). Model for any page with threads.
- `c01-t03` Object-Oriented Programming Refresher: a normal depth-2 page with two short Java files. Model for depth-2 pages.

## Shared running examples
- **Capstone (c05, all 13 pages) is ONE system: a Meeting Room Booking System.** Core classes, spelled exactly: `Building`, `Room`, `Employee`, `Booking`, `BookingService`, `RoomRepository`, `BookingRepository`, `NotificationService`, `ConflictPolicy` (strategy for overlap rules), `AuditLogger`. Requirements: search free rooms by capacity and time slot, book/cancel, no double booking (overlap check), recurring bookings as a stretch goal, notify attendees. Each capstone page builds on the previous one's classes; do not rename them.
- c03-t13 (mid-course project) lets the learner pick from the c03 systems and gives a reusable checklist; it does not design a new system.
- **Capstone API (Java)**: `BookingService.searchFree(int capacity, double start, double end)`, `book(String employeeId, String roomId, double start, double end)`, `cancel(String bookingId, String employeeId)`; times are hours as `double` (9.5 = 09:30); errors are unchecked `BookingException` subclasses `RoomTakenException` / `InvalidSlotException` carrying a stable `code()` ("ROOM_TAKEN", "INVALID_SLOT"); `ConflictPolicy.conflicts(Booking candidate, List<Booking> existing)`; `BookingListener.onBooked(Booking)` implemented by `NotificationService` and `AuditLogger`; `BookingRepository` with `save` and `forRoom`.
- **Do not repeat a lesson**: c04-t10 (concurrency) must not rebuild the booking race of c03-t05/c03-t08; c04-t11 (plugins) must say how it differs from c04-t08 (one extension point).
- **No backticks inside `table` hero cells or `head`**: table cells render as plain text, so backticks show literally. Write `Invoice class`, not `` `Invoice` ``.
