import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;

public class ReservationLifecycle {
  public static void main(String[] args) {
    LocalDate checkIn = LocalDate.of(2026, 3, 10);
    Reservation a = new Reservation("RS-1", checkIn);
    a.move(Status.CONFIRMED, checkIn.minusDays(9));
    a.move(Status.CHECKED_IN, checkIn.minusDays(1));   // too early
    a.move(Status.CHECKED_IN, checkIn);
    a.move(Status.CHECKED_OUT, checkIn.plusDays(2));
    Reservation b = new Reservation("RS-2", checkIn);
    b.move(Status.CONFIRMED, checkIn.minusDays(3));
    b.move(Status.NO_SHOW, checkIn.plusDays(1));
    b.move(Status.CHECKED_IN, checkIn.plusDays(1));    // too late
    Reservation c = new Reservation("RS-3", checkIn);
    c.move(Status.EXPIRED, checkIn.minusDays(5));
    c.move(Status.CONFIRMED, checkIn.minusDays(5));    // paid after expiry
  }
}

enum Status {
  HELD, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, EXPIRED, NO_SHOW;

  Set<Status> next() {
    switch (this) {
      case HELD: return EnumSet.of(CONFIRMED, CANCELLED, EXPIRED);
      case CONFIRMED: return EnumSet.of(CHECKED_IN, CANCELLED, NO_SHOW);
      case CHECKED_IN: return EnumSet.of(CHECKED_OUT);
      default: return EnumSet.noneOf(Status.class);  // terminal states
    }
  }
}

class Reservation {
  final String id; final LocalDate checkIn;
  Status status = Status.HELD;
  Reservation(String id, LocalDate checkIn) {
    this.id = id; this.checkIn = checkIn;
  }
  void move(Status to, LocalDate today) {
    String why = null;
    if (!status.next().contains(to)) why = "not allowed";
    else if (to == Status.CHECKED_IN && today.isBefore(checkIn))
      why = "before check-in date";
    else if (to == Status.NO_SHOW && !today.isAfter(checkIn))
      why = "guest may still arrive";
    if (why != null) {
      System.out.println(id + " refused " + status + " -> " + to
          + " (" + why + ")");
      return;
    }
    System.out.println(id + " " + status + " -> " + to);
    status = to;
  }
}
