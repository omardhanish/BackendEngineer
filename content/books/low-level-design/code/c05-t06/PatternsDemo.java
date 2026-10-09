import java.util.*;
public class PatternsDemo {
    public static void main(String[] args) {
        var svc = new BookingService(new BufferPolicy(0.25),
            List.of(new NotificationService(), new AuditLogger()));
        svc.book("E7", "R-101", 10, 11);
        svc.book("E9", "R-101", 11, 12);
        svc.book("E9", "R-101", 11.5, 12.5);
    }
}
record Booking(String id, String roomId, String employeeId,
               double start, double end) {}
interface ConflictPolicy {                                  // Strategy
    boolean conflicts(Booking candidate, List<Booking> existing);
}
record BufferPolicy(double gap) implements ConflictPolicy {
    public boolean conflicts(Booking c, List<Booking> existing) {
        return existing.stream().anyMatch(b ->
            c.start() < b.end() + gap && b.start() < c.end() + gap);
    }
}
interface BookingListener { void onBooked(Booking b); }    // Observer
class NotificationService implements BookingListener {
    public void onBooked(Booking b) { System.out.println("notify " + b); }
}
class AuditLogger implements BookingListener {
    public void onBooked(Booking b) { System.out.println("audit " + b.id()); }
}
class BookingService {
    private final ConflictPolicy policy;
    private final List<BookingListener> listeners;
    private final List<Booking> saved = new ArrayList<>();
    BookingService(ConflictPolicy p, List<BookingListener> ls) {
        policy = p; listeners = ls;
    }
    void book(String employeeId, String roomId, double start, double end) {
        var b = new Booking("BK" + (saved.size() + 1), roomId,
            employeeId, start, end);
        var existing = saved.stream()
            .filter(x -> x.roomId().equals(roomId)).toList();
        if (policy.conflicts(b, existing)) {
            System.out.println("refused " + start + "-" + end);
        } else { saved.add(b); listeners.forEach(l -> l.onBooked(b)); }
    }
}
