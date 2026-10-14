import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public class BookingLifecycle {
  public static void main(String[] args) {
    Booking a = new Booking("BK-1");
    a.moveTo(Status.CHECKED_IN);   // organizer taps "check in"
    a.moveTo(Status.COMPLETED);    // meeting end time passes
    a.moveTo(Status.CANCELLED);    // too late: meeting is over
    Booking b = new Booking("BK-2");
    b.moveTo(Status.RELEASED);     // nobody checked in within 10 min
    b.moveTo(Status.CHECKED_IN);   // late arrival cannot reclaim it
    Booking c = new Booking("BK-3");
    c.moveTo(Status.CANCELLED);    // cancelled before it starts
    System.out.println("BK-3 blocks room? " + c.status().blocksRoom());
  }
}

enum Status {
  BOOKED, CHECKED_IN, COMPLETED, CANCELLED, RELEASED;

  private static final Map<Status, Set<Status>> NEXT =
      new EnumMap<>(Status.class);
  static {
    NEXT.put(BOOKED, EnumSet.of(CHECKED_IN, CANCELLED, RELEASED));
    NEXT.put(CHECKED_IN, EnumSet.of(COMPLETED));
    NEXT.put(COMPLETED, EnumSet.noneOf(Status.class));
    NEXT.put(CANCELLED, EnumSet.noneOf(Status.class));
    NEXT.put(RELEASED, EnumSet.noneOf(Status.class));
  }
  boolean canMoveTo(Status to) { return NEXT.get(this).contains(to); }
  boolean blocksRoom() { return this == BOOKED || this == CHECKED_IN; }
}

class Booking {
  final String id;
  private Status status = Status.BOOKED;
  Booking(String id) { this.id = id; }
  Status status() { return status; }
  void moveTo(Status to) {
    if (!status.canMoveTo(to)) {
      System.out.println(id + " refused " + status + " -> " + to);
      return;
    }
    System.out.println(id + " " + status + " -> " + to);
    status = to;
  }
}
