import java.util.*;

public class IndexedSearch {
    public static void main(String[] args) {
        BookingRepository repo = new BookingRepository();
        List<Room> rooms = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            Room room = new Room(String.format("R%02d", i), 4 + (i % 3) * 4);
            rooms.add(room);
            for (int k = 0; k < 8; k++) {        // same data as before
                if (k == i % 8) continue;
                repo.save(new Booking(room.id(), 9.0 + k, 10.0 + k));
            }
        }
        var search = new SearchService(rooms, repo, new StrictOverlap());
        System.out.println("free: " + search.searchFree(8, 13.0, 14.0));
        System.out.println("bookings read: " + repo.reads);
    }
}
record Room(String id, int capacity) {}
record Booking(String roomId, double start, double end) {}

interface ConflictPolicy { boolean conflicts(Booking c, List<Booking> all); }
class StrictOverlap implements ConflictPolicy {   // unchanged
    public boolean conflicts(Booking c, List<Booking> existing) {
        return existing.stream()
                .anyMatch(b -> c.start() < b.end() && b.start() < c.end());
    }
}
// Invariant: book() rejects clashes before save, so starts are unique.
class BookingRepository {
    private final Map<String, TreeMap<Double, Booking>> byRoom =
            new HashMap<>();                    // room -> bookings by start
    int reads;                                  // bookings looked at
    void save(Booking b) {
        byRoom.computeIfAbsent(b.roomId(), id -> new TreeMap<>())
              .put(b.start(), b);
    }
    List<Booking> forRoom(String roomId) {
        TreeMap<Double, Booking> day = byRoom.get(roomId);
        if (day == null) return List.of();
        reads += day.size();                    // only this room's bookings
        return List.copyOf(day.values());       // sorted by start
    }
}
// Same as c11-t04: one ConflictPolicy decides for search and book.
record SearchService(List<Room> rooms, BookingRepository repo,
                     ConflictPolicy policy) {
    List<String> searchFree(int capacity, double start, double end) {
        List<String> free = new ArrayList<>();
        for (Room r : rooms) {
            Booking probe = new Booking(r.id(), start, end);
            if (r.capacity() >= capacity
                    && !policy.conflicts(probe, repo.forRoom(r.id())))
                free.add(r.id());
        }
        return free;
    }
}
