import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class LibraryModel {
  public static void main(String[] args) {
    Book book = new Book("978-1-4028-9462-6", "Quiet Rivers", "A. Rao");
    BookCopy c1 = new BookCopy("CP-1", book.isbn());
    BookCopy c2 = new BookCopy("CP-2", book.isbn());
    Member lina = new Member("M-1", "Lina");
    LocalDate jan5 = LocalDate.of(2026, 1, 5);
    Loan loan = new Loan("LN-1", c1.id, lina.id, jan5, jan5.plusDays(14));
    c1.status = CopyStatus.ON_LOAN;
    System.out.println(book.title() + ": " + c1 + ", " + c2);
    System.out.println(loan);

    FinePolicy fines = new PerDayFine(1000, 10000);
    LocalDate back = LocalDate.of(2026, 1, 23);
    System.out.println("fine, back " + back + ": "
        + fines.fineFor(loan.dueOn, back));
    System.out.println("fine, 30 days late: "
        + fines.fineFor(loan.dueOn, loan.dueOn.plusDays(30)));
    System.out.println(new Reservation("RS-1", book.isbn(), "M-2", 1));

    try {
      new Loan("LN-2", c2.id, lina.id, jan5, jan5.minusDays(1));
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
    try {
      new Book(" ", "Untitled", "Nobody");
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum CopyStatus { AVAILABLE, ON_LOAN, ON_HOLD_SHELF, LOST }

enum LoanStatus { ACTIVE, OVERDUE, RETURNED, LOST }

enum ReservationStatus { WAITING, READY, FULFILLED, EXPIRED, CANCELLED }

// A title in the catalog. Many physical copies share one Book.
record Book(String isbn, String title, String author) {
  Book {
    if (isbn.isBlank()) throw new IllegalArgumentException("isbn needed");
  }
}

// One physical item with a barcode. Its status changes over time.
final class BookCopy {
  final String id, isbn;
  CopyStatus status = CopyStatus.AVAILABLE;
  BookCopy(String id, String isbn) { this.id = id; this.isbn = isbn; }
  public String toString() { return id + " " + status; }
}

final class Member {
  final String id, name;
  long fineDueMinor = 0;
  Member(String id, String name) { this.id = id; this.name = name; }
}

final class Loan {
  final String id, copyId, memberId;
  final LocalDate borrowedOn;
  LocalDate dueOn, returnedOn;
  int renewals = 0;
  LoanStatus status = LoanStatus.ACTIVE;

  Loan(String id, String copyId, String memberId, LocalDate borrowedOn,
      LocalDate dueOn) {
    if (!dueOn.isAfter(borrowedOn))
      throw new IllegalArgumentException("due date must be after borrow");
    this.id = id; this.copyId = copyId; this.memberId = memberId;
    this.borrowedOn = borrowedOn; this.dueOn = dueOn;
  }
  public String toString() {
    return id + " " + copyId + " -> " + memberId + " due " + dueOn
        + " " + status;
  }
}

// A member waits for a title (any copy), not for one copy.
record Reservation(String id, String isbn, String memberId, long seq) {}

interface FinePolicy { long fineFor(LocalDate due, LocalDate returned); }

record PerDayFine(long perDayMinor, long capMinor) implements FinePolicy {
  public long fineFor(LocalDate due, LocalDate returned) {
    long late = Math.max(0, ChronoUnit.DAYS.between(due, returned));
    return Math.min(late * perDayMinor, capMinor);
  }
}
