import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class CoreBooking {
  public static void main(String[] args) {
    List<Room> rooms = List.of(new Room("R-1", "Orion", 3, 4),
        new Room("R-2", "Vega", 3, 10), new Room("R-3", "Lyra", 5, 6));
    BookingService svc = new BookingService(rooms,
        new SmallestFitStrategy(), (b, msg) -> System.out.println(
            "  notify " + b.organizerId() + ": " + msg));
    svc.book("E-1", 4, at(10, 0), at(11, 0));   // smallest room for 4
    svc.book("E-2", 3, at(10, 30), at(11, 30)); // R-1 busy: next fit
    svc.book("E-3", 12, at(9, 0), at(9, 30));   // nothing that large
    svc.book("E-4", 4, at(11, 0), at(12, 0));   // back-to-back is fine
  }
  static LocalDateTime at(int h, int m) {
    return LocalDateTime.of(2026, 1, 15, h, m);
  }
}

record Room(String id, String name, int floor, int capacity) {}

record Interval(LocalDateTime start, LocalDateTime end) {
  boolean overlaps(Interval o) {
    return start.isBefore(o.end) && o.start.isBefore(end);
  }
}

record Booking(String id, String roomId, String organizerId, Interval when) {}

interface RoomSelectionStrategy {        // Strategy: which free room wins
  Optional<Room> pick(List<Room> freeRooms, int attendees);
}

class SmallestFitStrategy implements RoomSelectionStrategy {
  public Optional<Room> pick(List<Room> free, int attendees) {
    return free.stream().filter(r -> r.capacity() >= attendees)
        .min(Comparator.comparingInt(Room::capacity)
            .thenComparing(Room::id));
  }
}

interface BookingListener { void onEvent(Booking b, String msg); }

class Calendar {                         // one per room
  private final List<Booking> bookings = new ArrayList<>();
  boolean isFree(Interval iv) {
    return bookings.stream().noneMatch(b -> b.when().overlaps(iv));
  }
  void add(Booking b) { bookings.add(b); }
}

class BookingService {                   // Facade: the one entry point
  private final List<Room> rooms;
  private final Map<String, Calendar> calendars = new LinkedHashMap<>();
  private final RoomSelectionStrategy strategy;
  private final BookingListener listener;
  private int seq = 0;

  BookingService(List<Room> rooms, RoomSelectionStrategy strategy,
      BookingListener listener) {
    this.rooms = rooms; this.strategy = strategy; this.listener = listener;
    rooms.forEach(r -> calendars.put(r.id(), new Calendar()));
  }

  Optional<Booking> book(String organizerId, int attendees,
      LocalDateTime start, LocalDateTime end) {
    Interval iv = new Interval(start, end);
    List<Room> free = rooms.stream()
        .filter(r -> calendars.get(r.id()).isFree(iv)).toList();
    Optional<Room> room = strategy.pick(free, attendees);
    System.out.println(organizerId + " wants " + attendees + " at "
        + start.toLocalTime() + " -> "
        + room.map(Room::name).orElse("NO_ROOM_AVAILABLE"));
    return room.map(r -> {
      Booking b = new Booking("BK-" + (++seq), r.id(), organizerId, iv);
      calendars.get(r.id()).add(b);
      listener.onEvent(b, b.id() + " confirmed in " + r.name());
      return b;
    });
  }
}
