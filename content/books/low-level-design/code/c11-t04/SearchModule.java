import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

public class SearchModule {
    private static int failures = 0;

    public static void main(String[] args) {
        Room r1 = new Room("R1", 4);
        Room r2 = new Room("R2", 10);
        Room r3 = new Room("R3", 6);
        RoomRepository rooms = () -> List.of(r1, r2, r3);
        MemoryBookings bookings = new MemoryBookings();
        bookings.save(new Booking("B1", "R2", "e1", 9.0, 10.0));
        BookingService svc = new BookingService(rooms, bookings,
            (c, existing) -> existing.stream().anyMatch(c::overlaps));

        check("capacity is a minimum, not exact",
            svc.searchFree(6, 13.0, 14.0).equals(List.of(r2, r3)));
        check("busy room is excluded",
            svc.searchFree(6, 9.5, 10.5).equals(List.of(r3)));
        check("slot ending as B1 starts is free",
            svc.searchFree(10, 8.0, 9.0).equals(List.of(r2)));
        check("no room is big enough",
            svc.searchFree(20, 9.0, 10.0).isEmpty());
        System.out.println(failures == 0 ? "all checks passed"
            : failures + " check(s) failed");
    }

    static void check(String name, boolean ok) {
        if (!ok) failures++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}

// The query half of BookingService; book and cancel are in the other tab.
class BookingService {
    private final RoomRepository rooms;
    private final BookingRepository bookings;
    private final ConflictPolicy policy;

    BookingService(RoomRepository rooms, BookingRepository bookings,
                   ConflictPolicy policy) {
        this.rooms = Objects.requireNonNull(rooms, "rooms");
        this.bookings = Objects.requireNonNull(bookings, "bookings");
        this.policy = Objects.requireNonNull(policy, "policy");
    }

    List<Room> searchFree(int capacity, double start, double end) {
        if (capacity < 1) {
            throw new IllegalArgumentException("capacity must be >= 1");
        }
        List<Room> free = new ArrayList<>();
        for (Room r : rooms.findAll()) {
            Booking probe = new Booking("probe", r.id(), "-", start, end);
            if (r.capacity() >= capacity
                    && !policy.conflicts(probe, bookings.forRoom(r.id()))) {
                free.add(r);
            }
        }
        return free;
    }
}

record Room(String id, int capacity) { }

record Booking(String id, String roomId, String employeeId,
               double start, double end) {
    boolean overlaps(Booking o) {
        return start < o.end && o.start < end;
    }
}

// Interfaces trimmed to what searchFree calls; c11-t03 has them all.
interface RoomRepository {
    List<Room> findAll();
}

interface BookingRepository {
    void save(Booking b);
    List<Booking> forRoom(String roomId);
}

interface ConflictPolicy {
    boolean conflicts(Booking candidate, List<Booking> existing);
}

class MemoryBookings implements BookingRepository {
    private final Map<String, Booking> byId = new TreeMap<>();
    public void save(Booking b) { byId.put(b.id(), b); }
    public List<Booking> forRoom(String roomId) {
        return byId.values().stream()
            .filter(b -> b.roomId().equals(roomId)).toList();
    }
}
