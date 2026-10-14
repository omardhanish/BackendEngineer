import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class ClosedDaysFine {
  public static void main(String[] args) {
    LocalDate due = LocalDate.of(2026, 1, 19);
    LocalDate back = LocalDate.of(2026, 1, 27);
    List<FinePolicy> policies = List.of(
        new PerDayFine(1000, 10000),
        new OpenDaysOnly(new PerDayFine(1000, 10000),
            EnumSet.of(DayOfWeek.SUNDAY)));
    System.out.println("due " + due.getDayOfWeek() + ", back "
        + back.getDayOfWeek());
    for (FinePolicy p : policies)
      System.out.println(p.getClass().getSimpleName() + " -> "
          + p.fineFor(due, back));
  }
}

interface FinePolicy { long fineFor(LocalDate due, LocalDate returned); }

record PerDayFine(long perDay, long cap) implements FinePolicy {
  public long fineFor(LocalDate due, LocalDate returned) {
    long late = Math.max(0, ChronoUnit.DAYS.between(due, returned));
    return Math.min(late * perDay, cap);
  }
}

// New rule, new class. LibraryService and PerDayFine stay unchanged.
// Days the library is closed do not count as late.
record OpenDaysOnly(PerDayFine base, Set<DayOfWeek> closed)
    implements FinePolicy {
  public long fineFor(LocalDate due, LocalDate returned) {
    if (!returned.isAfter(due)) return 0;
    long openLate = due.plusDays(1).datesUntil(returned.plusDays(1))
        .filter(d -> !closed.contains(d.getDayOfWeek()))
        .count();
    return Math.min(openLate * base.perDay(), base.cap());
  }
}
