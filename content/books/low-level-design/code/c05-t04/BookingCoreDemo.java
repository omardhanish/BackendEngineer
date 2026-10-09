import java.util.*;

public class BookingCoreDemo {
    public static void main(String[] args) {
        var rooms = new InMemoryRoomRepository(List.of(new Room("R-101", 6),
            new Room("R-201", 12), new Room("R-301", 4)));
        ConflictPolicy overlap = (c, ex) -> ex.stream()
            .anyMatch(b -> c.start() < b.end() && b.start() < c.end());
        var svc = new BookingService(rooms, new InMemoryBookingRepository(),
            overlap);
        System.out.println("free: " + svc.searchFree(5, 10, 11));
        System.out.println("booked: " + svc.book("E7", "R-101", 10, 11).id());
        try {
            svc.book("E9", "R-101", 10.5, 12);
        } catch (IllegalStateException e) {
            System.out.println("refused: " + e.getMessage());
        }
        try {
            svc.cancel("BK1", "E9");
        } catch (IllegalStateException e) {
            System.out.println("refused: " + e.getMessage());
        }
        svc.cancel("BK1", "E7");
        System.out.println("after cancel: " + svc.searchFree(5, 10, 11));
    }
}

class BookingService {
    private final RoomRepository rooms;
    private final BookingRepository bookings;
    private final ConflictPolicy policy;
    private int nextId = 1;
    BookingService(RoomRepository r, BookingRepository b, ConflictPolicy p) {
        rooms = r; bookings = b; policy = p;
    }
    List<String> searchFree(int capacity, double start, double end) {
        return rooms.all().stream().filter(r -> r.capacity() >= capacity)
            .filter(r -> !clash(new Booking("?", r.id(), "?", start, end)))
            .map(Room::id).toList();
    }
    Booking book(String employeeId, String roomId, double start, double end) {
        var b = new Booking("BK" + nextId, roomId, employeeId, start, end);
        if (clash(b)) throw new IllegalStateException(roomId + " is taken");
        nextId++;
        bookings.save(b);
        return b;
    }
    void cancel(String bookingId, String employeeId) {
        var b = bookings.find(bookingId).orElseThrow(
            () -> new IllegalStateException(bookingId + " not found"));
        if (!b.employeeId().equals(employeeId))
            throw new IllegalStateException(employeeId + " does not own it");
        bookings.remove(bookingId);
    }
    private boolean clash(Booking b) {
        return policy.conflicts(b, bookings.forRoom(b.roomId()));
    }
}

record Room(String id, int capacity) {}
record Booking(String id, String roomId, String employeeId,
               double start, double end) {}
interface ConflictPolicy { boolean conflicts(Booking c, List<Booking> ex); }
interface RoomRepository { List<Room> all(); }
interface BookingRepository {
    void save(Booking b);
    List<Booking> forRoom(String roomId);
    Optional<Booking> find(String id);
    void remove(String id);
}

record InMemoryRoomRepository(List<Room> all) implements RoomRepository {}
class InMemoryBookingRepository implements BookingRepository {
    private final List<Booking> saved = new ArrayList<>();
    public void save(Booking b) { saved.add(b); }
    public List<Booking> forRoom(String roomId) {
        return saved.stream().filter(b -> b.roomId().equals(roomId)).toList();
    }
    public Optional<Booking> find(String id) {
        return saved.stream().filter(b -> b.id().equals(id)).findFirst();
    }
    public void remove(String id) { saved.removeIf(b -> b.id().equals(id)); }
}
