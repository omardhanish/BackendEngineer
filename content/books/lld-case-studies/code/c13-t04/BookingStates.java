import java.util.*;

public class BookingStates {
  public static void main(String[] args) {
    Booking a = new Booking("BK-1");
    a.moveTo(BookingStatus.CONFIRMED, "paid");
    a.moveTo(BookingStatus.COMPLETED, "game played");
    a.moveTo(BookingStatus.CANCELLED, "player cancels after the game");
    Booking b = new Booking("BK-2");
    b.moveTo(BookingStatus.EXPIRED, "hold ran out");
    b.moveTo(BookingStatus.CONFIRMED, "late payment arrives");
    Booking c = new Booking("BK-3");
    c.moveTo(BookingStatus.CONFIRMED, "paid");
    c.moveTo(BookingStatus.CANCELLED, "player cancels early");
  }
}

enum BookingStatus {
  PENDING, CONFIRMED, CANCELLED, EXPIRED, COMPLETED;

  private static final Map<BookingStatus, Set<BookingStatus>> NEXT =
      new EnumMap<>(BookingStatus.class);
  static {
    NEXT.put(PENDING, EnumSet.of(CONFIRMED, EXPIRED, CANCELLED));
    NEXT.put(CONFIRMED, EnumSet.of(CANCELLED, COMPLETED));
    NEXT.put(CANCELLED, EnumSet.noneOf(BookingStatus.class));
    NEXT.put(EXPIRED, EnumSet.noneOf(BookingStatus.class));
    NEXT.put(COMPLETED, EnumSet.noneOf(BookingStatus.class));
  }
  boolean canMoveTo(BookingStatus s) { return NEXT.get(this).contains(s); }
  boolean holdsHours() { return this != CANCELLED && this != EXPIRED; }
}

class Booking {
  final String id;
  private BookingStatus status = BookingStatus.PENDING;
  Booking(String id) { this.id = id; }

  void moveTo(BookingStatus next, String why) {
    if (!status.canMoveTo(next)) {
      System.out.printf("%s refused %s -> %s (%s)%n",
          id, status, next, why);
      return;
    }
    BookingStatus old = status;
    status = next;
    String hours = old.holdsHours() && !next.holdsHours()
        ? ", court hours freed" : "";
    System.out.printf("%s %s -> %s (%s)%s%n", id, old, next, why, hours);
  }
}
