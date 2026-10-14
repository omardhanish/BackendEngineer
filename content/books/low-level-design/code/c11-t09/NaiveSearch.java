import java.util.ArrayList;
import java.util.List;

public class NaiveSearch {
    public static void main(String[] args) {
        BookingRepository repo = new BookingRepository();
        List<Room> rooms = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            Room room = new Room(String.format("R%02d", i), 4 + (i % 3) * 4);
            rooms.add(room);
            for (int k = 0; k < 8; k++) {        // 09:00-17:00, one gap
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
class StrictOverlap implements ConflictPolicy {   // half-open overlap
    public boolean conflicts(Booking c, List<Booking> existing) {
        return existing.stream()
                .anyMatch(b -> c.start() < b.end() && b.start() < c.end());
    }
}
class BookingRepository {
    private final List<Booking> all = new ArrayList<>(); // one flat list
    int reads;                                  // bookings looked at
    void save(Booking b) { all.add(b); }
    List<Booking> forRoom(String roomId) {
        List<Booking> mine = new ArrayList<>();
        for (Booking b : all) {                 // scans every room's bookings
            reads++;
            if (b.roomId().equals(roomId)) mine.add(b);
        }
        return mine;
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
