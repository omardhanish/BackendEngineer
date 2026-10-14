import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class CoreLibrary {
  public static void main(String[] args) {
    ManualToday today = new ManualToday(LocalDate.of(2026, 1, 5));
    LibraryService lib = new LibraryService(today,
        new PerDayFine(1000, 10000),
        (member, msg) -> System.out.println("  notify " + member
            + ": " + msg));
    lib.addCopy("CP-1", "ISBN-1");
    attempt(() -> lib.borrow("M-1", "ISBN-1"));
    attempt(() -> lib.borrow("M-2", "ISBN-1"));
    lib.reserve("M-2", "ISBN-1");
    today.set(LocalDate.of(2026, 1, 22));
    attempt(() -> "fine " + lib.giveBack("CP-1"));
    attempt(() -> lib.borrow("M-3", "ISBN-1"));
    attempt(() -> lib.borrow("M-2", "ISBN-1"));
  }
  static void attempt(java.util.function.Supplier<Object> action) {
    try { System.out.println(action.get()); }
    catch (LibraryException e) { System.out.println("refused: "
        + e.getMessage()); }
  }
}

interface Today { LocalDate get(); }
interface FinePolicy { long fineFor(LocalDate due, LocalDate returned); }
interface Notifier { void send(String memberId, String message); }

class LibraryException extends RuntimeException {
  LibraryException(String m) { super(m); } }

// Facade: callers see one service; policies are injected interfaces.
class LibraryService {
  static final int LOAN_DAYS = 14, MAX_LOANS = 5;
  private final Today today;
  private final FinePolicy fines;
  private final Notifier notifier;
  private final Map<String, Copy> copies = new LinkedHashMap<>();
  private final Map<String, Loan> openLoans = new HashMap<>(); // by copy
  private final Map<String, Deque<String>> queues = new HashMap<>();
  private int loanSeq = 0;

  LibraryService(Today today, FinePolicy fines, Notifier notifier) {
    this.today = today; this.fines = fines; this.notifier = notifier;
  }
  void addCopy(String id, String isbn) { copies.put(id, new Copy(id, isbn)); }

  void reserve(String memberId, String isbn) {
    queues.computeIfAbsent(isbn, k -> new ArrayDeque<>()).add(memberId);
  }
  Loan borrow(String memberId, String isbn) {
    long open = openLoans.values().stream()
        .filter(l -> l.memberId().equals(memberId)).count();
    if (open >= MAX_LOANS) throw new LibraryException("loan limit");
    Copy copy = copies.values().stream()
        .filter(c -> c.isbn.equals(isbn))
        .filter(c -> c.heldFor == null ? c.free
            : c.heldFor.equals(memberId))
        .findFirst()
        .orElseThrow(() -> new LibraryException("no copy for " + memberId));
    copy.free = false; copy.heldFor = null;
    Loan loan = new Loan("LN-" + (++loanSeq), copy.id, memberId,
        today.get().plusDays(LOAN_DAYS));
    openLoans.put(copy.id, loan);
    return loan;
  }
  long giveBack(String copyId) {
    Loan loan = openLoans.remove(copyId);
    if (loan == null) throw new LibraryException("no open loan");
    Copy copy = copies.get(copyId);
    Deque<String> queue = queues.getOrDefault(copy.isbn, new ArrayDeque<>());
    if (queue.isEmpty()) {
      copy.free = true;
    } else {                       // hand the copy to the first in line
      copy.heldFor = queue.poll();
      notifier.send(copy.heldFor, copy.isbn + " ready at the desk");
    }
    return fines.fineFor(loan.dueOn(), today.get());
  }
}

class Copy {
  final String id, isbn;
  boolean free = true;
  String heldFor;                  // member id while on the hold shelf
  Copy(String id, String isbn) { this.id = id; this.isbn = isbn; }
}

record Loan(String id, String copyId, String memberId, LocalDate dueOn) {}

record PerDayFine(long perDay, long cap) implements FinePolicy {
  public long fineFor(LocalDate due, LocalDate returned) {
    long late = Math.max(0, ChronoUnit.DAYS.between(due, returned));
    return Math.min(late * perDay, cap);
  }
}

class ManualToday implements Today {   // a test clock you move by hand
  private LocalDate date;
  ManualToday(LocalDate start) { date = start; }
  public LocalDate get() { return date; }
  void set(LocalDate d) { date = d; }
}
