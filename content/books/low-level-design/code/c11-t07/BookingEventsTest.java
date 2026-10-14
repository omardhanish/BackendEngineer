import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class BookingEventsTest {
    public static void main(String[] args) {
        RecordingListener spy = new RecordingListener();
        BookingService service = new BookingService(List.of(spy));

        service.book("ana", "R1", 9.0, 10.0);
        check("success emits one event",
                spy.events.equals(List.of("booked B1")));

        try { service.book("raj", "R1", 9.5, 10.5); }
        catch (RoomTakenException expected) { /* rejected on purpose */ }
        check("rejection emits nothing", spy.events.size() == 1);

        service.cancel("B1", "ana");
        check("cancel emits after booked", spy.events.equals(
                List.of("booked B1", "cancelled B1")));
        System.out.println("events seen: " + spy.events);
    }
    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}
record Booking(String id, String roomId, String employeeId,
               double start, double end) {}
interface BookingListener {
    void onBooked(Booking b);
    void onCancelled(Booking b);
}
abstract class BookingException extends RuntimeException {
    abstract String code();
}
class RoomTakenException extends BookingException {
    String code() { return "ROOM_TAKEN"; } }
class NotOwnerException extends BookingException {
    String code() { return "NOT_OWNER"; } }
// A hand-written fake: records calls instead of sending email.
final class RecordingListener implements BookingListener {
    final List<String> events = new ArrayList<>();
    public void onBooked(Booking b) { events.add("booked " + b.id()); }
    public void onCancelled(Booking b) { events.add("cancelled " + b.id()); }
}
final class BookingService {
    private final List<BookingListener> listeners;
    private final List<Booking> bookings = new ArrayList<>();
    BookingService(List<BookingListener> listeners) {
        this.listeners = List.copyOf(Objects.requireNonNull(listeners));
    }
    Booking book(String employeeId, String roomId, double start, double end) {
        boolean taken = bookings.stream().anyMatch(b -> b.roomId()
                .equals(roomId) && start < b.end() && b.start() < end);
        if (taken) throw new RoomTakenException();
        Booking b = new Booking("B" + (bookings.size() + 1),
                roomId, employeeId, start, end);
        bookings.add(b);
        listeners.forEach(l -> l.onBooked(b));
        return b;
    }
    void cancel(String bookingId, String employeeId) {
        Booking b = bookings.stream()
                .filter(x -> x.id().equals(bookingId))
                .findFirst().orElseThrow();
        if (!b.employeeId().equals(employeeId)) throw new NotOwnerException();
        bookings.remove(b);
        listeners.forEach(l -> l.onCancelled(b));
    }
}
