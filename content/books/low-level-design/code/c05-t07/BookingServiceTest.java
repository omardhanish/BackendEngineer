import java.util.*;
public class BookingServiceTest {
    static int passed, failed;
    public static void main(String[] args) {
        var spy = new SpyListener();
        var svc = new BookingService(spy);
        svc.book("E7", "R-101", 10, 11);
        check("back-to-back is allowed",
            svc.book("E9", "R-101", 11, 12).id().equals("BK2"));
        check("overlap is refused", errorOf(() ->
            svc.book("E9", "R-101", 10.5, 11.5)).equals("ROOM_TAKEN"));
        check("end before start is refused", errorOf(() ->
            svc.book("E9", "R-201", 15, 14)).equals("INVALID_SLOT"));
        check("listener hears only successes",
            spy.heard.equals(List.of("BK1", "BK2")));
        System.out.println(passed + " passed, " + failed + " failed");
    }
    static void check(String name, boolean ok) {
        if (ok) passed++; else failed++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
    static String errorOf(Runnable action) {
        try { action.run(); return "none"; }
        catch (BookingException e) { return e.code(); }
    }
}
class SpyListener implements BookingListener {     // hand-made test double
    final List<String> heard = new ArrayList<>();
    public void onBooked(Booking b) { heard.add(b.id()); }
}
record Booking(String id, String roomId, double start, double end) {}
interface BookingListener { void onBooked(Booking b); }
abstract class BookingException extends RuntimeException {
    abstract String code();
}
class RoomTakenException extends BookingException {
    String code() { return "ROOM_TAKEN"; }
}
class InvalidSlotException extends BookingException {
    String code() { return "INVALID_SLOT"; }
}
class BookingService {
    private final BookingListener listener;
    private final List<Booking> saved = new ArrayList<>();
    BookingService(BookingListener l) { listener = l; }
    Booking book(String employeeId, String roomId, double start, double end) {
        if (end <= start) throw new InvalidSlotException();
        for (Booking b : saved)
            if (b.roomId().equals(roomId) && start < b.end() && b.start() < end)
                throw new RoomTakenException();
        var b = new Booking("BK" + (saved.size() + 1), roomId, start, end);
        saved.add(b);
        listener.onBooked(b);
        return b;
    }
}
