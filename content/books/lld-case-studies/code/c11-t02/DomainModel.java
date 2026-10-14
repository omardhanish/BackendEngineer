import java.time.*;
import java.util.*;

public class DomainModel {
  public static void main(String[] args) {
    Restaurant r = new Restaurant("RS-1", "Olive Court", 90, List.of(
        new Table("T1", 2, Area.INDOOR), new Table("T2", 4, Area.INDOOR),
        new Table("T3", 6, Area.PATIO)));
    Customer ana = new Customer("C-1", "Ana", "+44 7700 900001");
    Instant seven = Instant.parse("2026-03-06T19:00:00Z");
    TimeSlot a = r.slotAt(seven);
    TimeSlot b = r.slotAt(seven.plus(Duration.ofMinutes(90)));
    TimeSlot c = r.slotAt(seven.plus(Duration.ofMinutes(60)));
    System.out.println(a + " overlaps " + b + "? " + a.overlaps(b));
    System.out.println(a + " overlaps " + c + "? " + a.overlaps(c));

    Reservation res = new Reservation("RV-1", ana, r.table("T2"), 3, a);
    System.out.println(res);
    try {
      new Reservation("RV-2", ana, r.table("T2"), 5, b);
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
    try {
      new TimeSlot(seven, seven);
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum Area { INDOOR, PATIO }

enum ReservationStatus { CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW }

record Customer(String id, String name, String phone) {
  Customer {
    if (phone.isBlank()) throw new IllegalArgumentException("phone needed");
  }
}

record Table(String id, int capacity, Area area) {
  Table {
    if (capacity < 1) throw new IllegalArgumentException("capacity < 1");
  }
}

// Half-open interval [start, end): a slot ending at 20:30 and one
// starting at 20:30 do not overlap.
record TimeSlot(Instant start, Instant end) {
  TimeSlot {
    if (!end.isAfter(start)) throw new IllegalArgumentException(
        "slot must end after it starts");
  }
  boolean overlaps(TimeSlot o) {
    return start.isBefore(o.end) && o.start.isBefore(end);
  }
  public String toString() {
    return start.toString().substring(11, 16) + "-"
        + end.toString().substring(11, 16);
  }
}

record Restaurant(String id, String name, int diningMinutes,
    List<Table> tables) {
  Restaurant { tables = List.copyOf(tables); }
  TimeSlot slotAt(Instant start) {
    return new TimeSlot(start, start.plus(Duration.ofMinutes(diningMinutes)));
  }
  Table table(String tableId) {
    return tables.stream().filter(t -> t.id().equals(tableId)).findFirst()
        .orElseThrow(() -> new IllegalArgumentException("no " + tableId));
  }
}

final class Reservation {
  final String id, customerId, tableId;
  final int partySize;
  final TimeSlot slot;
  ReservationStatus status = ReservationStatus.CONFIRMED;

  Reservation(String id, Customer c, Table t, int partySize, TimeSlot s) {
    if (partySize < 1 || partySize > t.capacity())
      throw new IllegalArgumentException("party of " + partySize
          + " does not fit " + t.id() + " (" + t.capacity() + " seats)");
    this.id = id; this.customerId = c.id(); this.tableId = t.id();
    this.partySize = partySize; this.slot = s;
  }
  public String toString() {
    return id + " " + customerId + " " + tableId + " x" + partySize
        + " " + slot + " " + status;
  }
}
