import java.util.*;

public class BookingLifecycle {
  public static void main(String[] args) {
    Booking paid = new Booking("BK-1");
    paid.moveTo(BookingStatus.CONFIRMED);
    paid.moveTo(BookingStatus.CANCELLED);
    Booking late = new Booking("BK-2");
    late.moveTo(BookingStatus.EXPIRED);
    late.moveTo(BookingStatus.CONFIRMED);
  }
}

enum BookingStatus {
  PENDING, CONFIRMED, EXPIRED, CANCELLED;

  private static final Map<BookingStatus, Set<BookingStatus>> NEXT =
      new EnumMap<>(BookingStatus.class);
  static {
    NEXT.put(PENDING, EnumSet.of(CONFIRMED, EXPIRED, CANCELLED));
    NEXT.put(CONFIRMED, EnumSet.of(CANCELLED));
    NEXT.put(EXPIRED, EnumSet.noneOf(BookingStatus.class));
    NEXT.put(CANCELLED, EnumSet.noneOf(BookingStatus.class));
  }
  boolean canMoveTo(BookingStatus to) { return NEXT.get(this).contains(to); }
}

class Booking {
  private final String id;
  private BookingStatus status = BookingStatus.PENDING;
  Booking(String id) { this.id = id; }

  void moveTo(BookingStatus to) {
    if (!status.canMoveTo(to)) {
      System.out.println(id + " refused " + status + " -> " + to);
      return;
    }
    System.out.println(id + " " + status + " -> " + to);
    status = to;
  }
}
