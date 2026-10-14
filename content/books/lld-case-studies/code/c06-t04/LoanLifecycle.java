import java.time.LocalDate;
import java.util.*;

public class LoanLifecycle {
  public static void main(String[] args) {
    Loan ln1 = new Loan("LN-1", LocalDate.of(2026, 1, 19));
    ln1.renew(false);              // allowed once, nobody waiting
    ln1.renew(false);              // second renewal: limit reached
    ln1.markOverdueIfLate(LocalDate.of(2026, 2, 3));
    ln1.giveBack();
    ln1.giveBack();                // a second scan of the same copy

    Loan ln2 = new Loan("LN-2", LocalDate.of(2026, 1, 19));
    ln2.renew(true);               // someone has reserved the title
    ln2.move(LoanStatus.LOST);
    ln2.giveBack();                // found after it was paid for
  }
}

enum LoanStatus {
  ACTIVE, OVERDUE, RETURNED, LOST;

  private static final Map<LoanStatus, Set<LoanStatus>> NEXT =
      new EnumMap<>(LoanStatus.class);
  static {
    NEXT.put(ACTIVE, EnumSet.of(OVERDUE, RETURNED, LOST));
    NEXT.put(OVERDUE, EnumSet.of(RETURNED, LOST));
    NEXT.put(LOST, EnumSet.of(RETURNED));
    NEXT.put(RETURNED, EnumSet.noneOf(LoanStatus.class));
  }
  boolean canMoveTo(LoanStatus to) { return NEXT.get(this).contains(to); }
}

class Loan {
  static final int MAX_RENEWALS = 1, LOAN_DAYS = 14;
  final String id;
  LocalDate dueOn;
  int renewals = 0;
  LoanStatus status = LoanStatus.ACTIVE;
  Loan(String id, LocalDate dueOn) { this.id = id; this.dueOn = dueOn; }

  void move(LoanStatus to) {
    if (!status.canMoveTo(to)) {
      System.out.println(id + " refused " + status + " -> " + to);
      return;
    }
    System.out.println(id + " " + status + " -> " + to);
    status = to;
  }
  // Renewal is an action inside ACTIVE, not a state of its own.
  void renew(boolean someoneWaiting) {
    String why = status != LoanStatus.ACTIVE ? "not ACTIVE"
        : renewals >= MAX_RENEWALS ? "renewal limit"
        : someoneWaiting ? "title is reserved" : null;
    if (why != null) {
      System.out.println(id + " renew refused: " + why);
      return;
    }
    renewals++;
    dueOn = dueOn.plusDays(LOAN_DAYS);
    System.out.println(id + " renewed, due " + dueOn);
  }
  void markOverdueIfLate(LocalDate today) {    // the nightly job
    if (status == LoanStatus.ACTIVE && today.isAfter(dueOn))
      move(LoanStatus.OVERDUE);
  }
  void giveBack() { move(LoanStatus.RETURNED); }
}
