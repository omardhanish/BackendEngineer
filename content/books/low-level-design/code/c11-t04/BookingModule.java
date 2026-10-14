import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;

public class BookingModule {
    public static void main(String[] args) {
        Map<String, Room> catalog = Map.of("R1", new Room("R1", 4));
        RoomRepository rooms = id -> Optional.ofNullable(catalog.get(id));
        BookingService svc = new BookingService(rooms, new MemoryBookings(),
            (c, existing) -> existing.stream().anyMatch(c::overlaps));

        Booking b1 = svc.book("e1", "R1", 9.0, 10.0);
        System.out.println("booked " + b1);
        attempt(() -> svc.book("e2", "R1", 9.5, 11.0));
        attempt(() -> svc.book("e2", "R1", 10.0, 9.0));
        attempt(() -> svc.cancel(b1.id(), "e2"));
        svc.cancel(b1.id(), "e1");
        System.out.println("rebooked " + svc.book("e2", "R1", 9.5, 11.0));
    }

    static void attempt(Runnable action) {
        try {
            action.run();
        } catch (BookingException e) {
            System.out.println(e.code() + ": " + e.getMessage());
        }
    }
}

class BookingService {
    private final RoomRepository rooms;
    private final BookingRepository bookings;
    private final ConflictPolicy policy;
    private int nextId = 1;

    BookingService(RoomRepository rooms, BookingRepository bookings,
                   ConflictPolicy policy) {
        this.rooms = Objects.requireNonNull(rooms, "rooms");
        this.bookings = Objects.requireNonNull(bookings, "bookings");
        this.policy = Objects.requireNonNull(policy, "policy");
    }

    synchronized Booking book(String employeeId, String roomId,
                              double start, double end) {
        Objects.requireNonNull(employeeId, "employeeId");
        if (start < 0 || end > 24 || start >= end) {
            throw new InvalidSlotException("bad slot " + start + "-" + end);
        }
        rooms.findById(roomId).orElseThrow(() ->
            new IllegalArgumentException("unknown room " + roomId));
        Booking candidate =
            new Booking("B" + nextId, roomId, employeeId, start, end);
        if (policy.conflicts(candidate, bookings.forRoom(roomId))) {
            throw new RoomTakenException(roomId + " is taken then");
        }
        nextId++;
        bookings.save(candidate);
        return candidate;
    }

    synchronized void cancel(String bookingId, String employeeId) {
        Booking b = bookings.findById(bookingId).orElseThrow(() ->
            new IllegalArgumentException("unknown booking " + bookingId));
        if (!b.employeeId().equals(employeeId)) {
            throw new NotOwnerException(employeeId + " does not own "
                + bookingId);
        }
        bookings.remove(bookingId);
    }
}

record Room(String id, int capacity) { }

record Booking(String id, String roomId, String employeeId,
               double start, double end) {
    boolean overlaps(Booking o) {
        return start < o.end && o.start < end;
    }
}

// Interfaces trimmed to what book and cancel call; c11-t03 has them all.
interface RoomRepository {
    Optional<Room> findById(String id);
}

interface ConflictPolicy {
    boolean conflicts(Booking candidate, List<Booking> existing);
}

interface BookingRepository {
    void save(Booking b);
    Optional<Booking> findById(String id);
    List<Booking> forRoom(String roomId);
    void remove(String id);
}

class MemoryBookings implements BookingRepository {
    private final Map<String, Booking> byId = new TreeMap<>();
    public void save(Booking b) { byId.put(b.id(), b); }
    public Optional<Booking> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }
    public List<Booking> forRoom(String roomId) {
        return byId.values().stream()
            .filter(b -> b.roomId().equals(roomId)).toList();
    }
    public void remove(String id) { byId.remove(id); }
}

abstract class BookingException extends RuntimeException {
    BookingException(String message) { super(message); }
    abstract String code();
}

class RoomTakenException extends BookingException {
    RoomTakenException(String m) { super(m); }
    String code() { return "ROOM_TAKEN"; }
}

class InvalidSlotException extends BookingException {
    InvalidSlotException(String m) { super(m); }
    String code() { return "INVALID_SLOT"; }
}

class NotOwnerException extends BookingException {
    NotOwnerException(String m) { super(m); }
    String code() { return "NOT_OWNER"; }
}
