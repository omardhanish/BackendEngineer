import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

public class Contracts {
    public static void main(String[] args) {
        BookingRepository repo = new InMemoryBookingRepository();
        ConflictPolicy overlap = (candidate, existing) -> existing.stream()
            .anyMatch(b -> candidate.start() < b.end()
                && b.start() < candidate.end());
        BookingListener audit = b -> System.out.println("booked " + b.id());

        Booking first = new Booking("B1", "R1", "e1", 9.0, 10.0);
        repo.save(first);
        audit.onBooked(first);

        Booking clash = new Booking("B2", "R1", "e2", 9.5, 11.0);
        Booking later = new Booking("B3", "R1", "e2", 10.0, 11.0);
        List<Booking> inR1 = repo.forRoom("R1");
        System.out.println("B2 conflicts: " + overlap.conflicts(clash, inR1));
        System.out.println("B3 conflicts: " + overlap.conflicts(later, inR1));
        System.out.println("find B9: " + repo.findById("B9").isPresent());
    }
}

record Room(String id, String buildingId, int capacity) { }

record Booking(String id, String roomId, String employeeId,
               double start, double end) { }

interface RoomRepository {
    Optional<Room> findById(String roomId);
    List<Room> findAll();
}

interface BookingRepository {
    void save(Booking booking);
    Optional<Booking> findById(String bookingId);
    List<Booking> forRoom(String roomId);
    void remove(String bookingId);
}

interface ConflictPolicy {
    boolean conflicts(Booking candidate, List<Booking> existing);
}

interface BookingListener {
    void onBooked(Booking booking);
    default void onCancelled(Booking booking) { }
}

class InMemoryBookingRepository implements BookingRepository {
    private final Map<String, Booking> byId = new TreeMap<>();

    public void save(Booking b) { byId.put(b.id(), b); }
    public Optional<Booking> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }
    public List<Booking> forRoom(String roomId) {
        List<Booking> out = new ArrayList<>();
        for (Booking b : byId.values()) {
            if (b.roomId().equals(roomId)) out.add(b);
        }
        return List.copyOf(out);
    }
    public void remove(String id) { byId.remove(id); }
}
