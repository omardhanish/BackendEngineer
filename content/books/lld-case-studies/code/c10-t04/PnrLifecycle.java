import java.util.*;

public class PnrLifecycle {
  public static void main(String[] args) {
    Booking a = new Booking("PNR-1");
    a.moveTo(BookingStatus.CONFIRMED);   // payment captured
    a.moveTo(BookingStatus.TICKETED);    // tickets issued
    a.moveTo(BookingStatus.CANCELLED);   // traveller cancels
    Booking b = new Booking("PNR-2");
    b.moveTo(BookingStatus.TICKETED);    // tickets before payment?
    b.moveTo(BookingStatus.EXPIRED);     // hold deadline passed
    b.moveTo(BookingStatus.CONFIRMED);   // late payment arrives
    System.out.println(a.pnr() + " history " + a.history());
    System.out.println(b.pnr() + " history " + b.history());
  }
}

enum BookingStatus {
  HELD, CONFIRMED, TICKETED, CANCELLED, EXPIRED;

  private static final Map<BookingStatus, Set<BookingStatus>> NEXT =
      new EnumMap<>(BookingStatus.class);
  static {
    NEXT.put(HELD, EnumSet.of(CONFIRMED, EXPIRED, CANCELLED));
    NEXT.put(CONFIRMED, EnumSet.of(TICKETED, CANCELLED));
    NEXT.put(TICKETED, EnumSet.of(CANCELLED));
    NEXT.put(CANCELLED, EnumSet.noneOf(BookingStatus.class));
    NEXT.put(EXPIRED, EnumSet.noneOf(BookingStatus.class));
  }
  boolean canMoveTo(BookingStatus to) { return NEXT.get(this).contains(to); }
}

class Booking {
  private final String pnr;
  private BookingStatus status = BookingStatus.HELD;
  private final List<BookingStatus> history = new ArrayList<>();

  Booking(String pnr) { this.pnr = pnr; history.add(status); }
  String pnr() { return pnr; }
  List<BookingStatus> history() { return history; }

  boolean moveTo(BookingStatus to) {
    if (!status.canMoveTo(to)) {
      System.out.println(pnr + " refused " + status + " -> " + to);
      return false;
    }
    System.out.println(pnr + " " + status + " -> " + to);
    status = to;
    history.add(to);
    return true;
  }
}
