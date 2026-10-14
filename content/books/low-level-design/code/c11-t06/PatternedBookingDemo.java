import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class PatternedBookingDemo {
    public static void main(String[] args) {
        BookingService service = new BookingService(new CleaningGap(0.25),
                List.of(new NotificationService(), new AuditLogger()));
        service.book("ana", "R1", 9.0, 10.0);
        try {
            service.book("raj", "R1", 10.0, 11.0);
        } catch (BookingException e) {
            System.out.println("rejected raj: " + e.code());
        }
        service.book("raj", "R1", 10.25, 11.0);
    }
}
record Booking(String id, String roomId, String employeeId,
               double start, double end) {}
interface ConflictPolicy {
    boolean conflicts(Booking candidate, List<Booking> existing);
}
record CleaningGap(double hours) implements ConflictPolicy {
    CleaningGap {
        if (hours < 0) throw new IllegalArgumentException("hours < 0");
    }
    public boolean conflicts(Booking c, List<Booking> existing) {
        return existing.stream().anyMatch(b ->
                c.start() < b.end() + hours && b.start() < c.end() + hours);
    }
}
interface BookingListener { void onBooked(Booking booking); }
final class NotificationService implements BookingListener {
    public void onBooked(Booking b) {
        System.out.println("email: " + b.employeeId() + " got " + b.roomId());
    }
}
final class AuditLogger implements BookingListener {
    public void onBooked(Booking b) {
        System.out.println("audit: " + b.id() + " at " + b.start());
    }
}
abstract class BookingException extends RuntimeException {
    BookingException(String message) { super(message); }
    abstract String code();
}
final class RoomTakenException extends BookingException {
    RoomTakenException(String roomId) { super(roomId + " is taken"); }
    String code() { return "ROOM_TAKEN"; }
}
final class BookingService {
    private final ConflictPolicy policy;
    private final List<BookingListener> listeners;
    private final List<Booking> bookings = new ArrayList<>();
    BookingService(ConflictPolicy policy, List<BookingListener> listeners) {
        this.policy = Objects.requireNonNull(policy, "policy");
        this.listeners = List.copyOf(listeners);
    }
    Booking book(String employeeId, String roomId, double start, double end) {
        Booking candidate = new Booking("B" + (bookings.size() + 1),
                roomId, employeeId, start, end);
        List<Booking> sameRoom = bookings.stream()
                .filter(b -> b.roomId().equals(roomId)).toList();
        if (policy.conflicts(candidate, sameRoom)) {
            throw new RoomTakenException(roomId);
        }
        bookings.add(candidate);
        listeners.forEach(listener -> listener.onBooked(candidate));
        return candidate;
    }
}
