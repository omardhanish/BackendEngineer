import java.util.*;

public class LibraryScope {
  public static void main(String[] args) {
    Set<UseCase> v1 = EnumSet.of(UseCase.SEARCH, UseCase.BORROW,
        UseCase.RETURN, UseCase.RENEW, UseCase.RESERVE,
        UseCase.PAY_FINE, UseCase.ADD_COPY, UseCase.MARK_OVERDUE,
        UseCase.EXPIRE_PICKUP);
    for (UseCase u : UseCase.values())
      System.out.printf("%-3s %-9s %s%n",
          v1.contains(u) ? "IN" : "OUT", u.actor, u);
    Policy p = new Policy(14, 5, 1, 1000, 10000, 5000, 3);
    System.out.println(p);
  }
}

enum Actor { MEMBER, LIBRARIAN, SYSTEM }

enum UseCase {
  SEARCH(Actor.MEMBER), BORROW(Actor.MEMBER), RETURN(Actor.MEMBER),
  RENEW(Actor.MEMBER), RESERVE(Actor.MEMBER), PAY_FINE(Actor.MEMBER),
  ADD_COPY(Actor.LIBRARIAN), MARK_OVERDUE(Actor.SYSTEM),
  EXPIRE_PICKUP(Actor.SYSTEM),
  EBOOK_LENDING(Actor.MEMBER), BRANCH_TRANSFER(Actor.LIBRARIAN),
  PURCHASE_ORDERS(Actor.LIBRARIAN);

  final Actor actor;
  UseCase(Actor actor) { this.actor = actor; }
}

// Every number is an assumption the interviewer can change.
record Policy(int loanDays, int maxActiveLoans, int maxRenewals,
    long finePerDayMinor, long fineCapMinor, long blockAtFineMinor,
    int pickupDays) {}
