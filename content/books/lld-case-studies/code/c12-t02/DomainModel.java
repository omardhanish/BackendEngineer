import java.time.LocalDateTime;
import java.util.List;
import java.util.TreeMap;

public class DomainModel {
  public static void main(String[] args) {
    Employee asha = new Employee("E-1", "Asha", "asha@corp.test");
    Room orion = new Room("R-1", "Orion", 3, 6);
    Calendar cal = new Calendar(orion);
    LocalDateTime day = LocalDateTime.of(2026, 1, 15, 0, 0);
    Interval slot = new Interval(day.withHour(10), day.withHour(11));
    Meeting sync = new Meeting("Design sync", asha,
        List.of("E-2", "E-3"), slot);
    Booking bk = cal.add("BK-1", sync);
    System.out.println(bk.id() + " " + orion.name() + " "
        + slot + " for " + sync.headcount());
    Interval next = new Interval(day.withHour(11), day.withHour(12));
    System.out.println("free " + next + "? " + cal.isFree(next));
    Interval half = new Interval(day.withHour(10).withMinute(30),
        day.withHour(11).withMinute(30));
    System.out.println("free " + half + "? " + cal.isFree(half));
    try {
      new Interval(day.withHour(12), day.withHour(12));
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
    try {
      new Meeting("All hands", asha, List.of("E-2", "E-3", "E-4",
          "E-5", "E-6", "E-7"), next).checkFits(orion);
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

record Employee(String id, String name, String email) {}

record Room(String id, String name, int floor, int capacity) {
  Room {
    if (capacity <= 0) throw new IllegalArgumentException("capacity");
  }
}

record Interval(LocalDateTime start, LocalDateTime end) {
  Interval {   // half-open [start, end): 11:00 end touches 11:00 start
    if (!start.isBefore(end))
      throw new IllegalArgumentException("start must be before end");
  }
  boolean overlaps(Interval o) {
    return start.isBefore(o.end) && o.start.isBefore(end);
  }
  public String toString() {
    return start.toLocalTime() + "-" + end.toLocalTime();
  }
}

record Meeting(String title, Employee organizer, List<String> guestIds,
    Interval when) {
  Meeting { guestIds = List.copyOf(guestIds); }
  int headcount() { return guestIds.size() + 1; }
  void checkFits(Room r) {
    if (headcount() > r.capacity()) throw new IllegalArgumentException(
        headcount() + " people > capacity " + r.capacity());
  }
}

enum BookingStatus { BOOKED, CHECKED_IN, COMPLETED, CANCELLED, RELEASED }

final class Booking {
  private final String id;
  private final Room room;
  private final Meeting meeting;
  private BookingStatus status = BookingStatus.BOOKED;
  Booking(String id, Room room, Meeting meeting) {
    this.id = id; this.room = room; this.meeting = meeting;
  }
  String id() { return id; }
  Meeting meeting() { return meeting; }
  BookingStatus status() { return status; }
}

final class Calendar {        // one per Room: active bookings by start
  private final Room room;
  private final TreeMap<LocalDateTime, Booking> active = new TreeMap<>();
  Calendar(Room room) { this.room = room; }
  boolean isFree(Interval iv) {   // only one neighbour can clash
    var prev = active.lowerEntry(iv.end());
    return prev == null || !prev.getValue().meeting().when().overlaps(iv);
  }
  Booking add(String id, Meeting m) {
    m.checkFits(room);
    if (!isFree(m.when())) throw new IllegalStateException("overlap");
    Booking b = new Booking(id, room, m);
    active.put(m.when().start(), b);
    return b;
  }
}
