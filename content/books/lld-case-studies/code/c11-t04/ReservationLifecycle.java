import java.time.*;
import java.util.*;

public class ReservationLifecycle {
  public static void main(String[] args) {
    Instant seven = Instant.parse("2026-03-06T19:00:00Z");
    Reservation a = new Reservation("RV-1", seven);
    a.seat();
    a.finish();
    Reservation b = new Reservation("RV-2", seven);
    b.markNoShow(seven.plusSeconds(10 * 60), Duration.ofMinutes(15));
    b.markNoShow(seven.plusSeconds(16 * 60), Duration.ofMinutes(15));
    b.seat();  // the party turns up late
    Reservation c = new Reservation("RV-3", seven);
    c.cancel();
    c.cancel();
  }
}

enum ReservationStatus {
  CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW;

  private static final Map<ReservationStatus, Set<ReservationStatus>> NEXT =
      new EnumMap<>(ReservationStatus.class);
  static {
    NEXT.put(CONFIRMED, EnumSet.of(SEATED, CANCELLED, NO_SHOW));
    NEXT.put(SEATED, EnumSet.of(COMPLETED));
    for (ReservationStatus s : values())
      NEXT.putIfAbsent(s, EnumSet.noneOf(ReservationStatus.class));
  }
  boolean canMoveTo(ReservationStatus to) {
    return NEXT.get(this).contains(to);
  }
  boolean isFinal() { return NEXT.get(this).isEmpty(); }
}

final class Reservation {
  final String id;
  final Instant start;
  private ReservationStatus status = ReservationStatus.CONFIRMED;

  Reservation(String id, Instant start) { this.id = id; this.start = start; }

  void seat() { moveTo(ReservationStatus.SEATED); }
  void finish() { moveTo(ReservationStatus.COMPLETED); }
  void cancel() { moveTo(ReservationStatus.CANCELLED); }

  void markNoShow(Instant now, Duration grace) {
    if (now.isBefore(start.plus(grace))) {
      System.out.println(id + " too early for no-show at "
          + now.toString().substring(11, 16));
      return;
    }
    moveTo(ReservationStatus.NO_SHOW);
  }

  private void moveTo(ReservationStatus to) {
    if (!status.canMoveTo(to)) {
      System.out.println(id + " refused " + status + " -> " + to
          + (status.isFinal() ? " (final)" : ""));
      return;
    }
    System.out.println(id + " " + status + " -> " + to);
    status = to;
  }
}
