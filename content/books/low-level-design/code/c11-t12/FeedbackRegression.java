import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.DoubleSupplier;

public class FeedbackRegression {
    private static int failed = 0;

    public static void main(String[] args) {
        BookingService service = new BookingService(() -> 11.0); // now 11:00
        String past = service.book("e1", "R1", 9.0, 10.0);
        String later = service.book("e1", "R1", 14.0, 15.0);
        // FB-4 from review: "you can cancel a meeting that already ended"
        check("FB-4 ended booking cannot cancel", "INVALID_SLOT",
            () -> service.cancel(past, "e1"));
        check("FB-4 upcoming booking still cancels", "OK",
            () -> service.cancel(later, "e1"));
        System.out.println(failed == 0 ? "all checks pass" : "fix needed");
    }

    static void check(String name, String expected, Runnable action) {
        String actual;
        try {
            action.run();
            actual = "OK";
        } catch (BookingException e) {
            actual = e.code();
        }
        boolean ok = actual.equals(expected);
        if (!ok) {
            failed++;
        }
        System.out.println((ok ? "PASS " : "FAIL ") + name + " -> " + actual);
    }
}

class BookingException extends RuntimeException {
    private final String code;

    BookingException(String code, String message) {
        super(message);
        this.code = code;
    }

    String code() {
        return code;
    }
}

class InvalidSlotException extends BookingException {
    InvalidSlotException(String message) {
        super("INVALID_SLOT", message);
    }
}

class NotOwnerException extends BookingException {
    NotOwnerException(String bookingId, String employeeId) {
        super("NOT_OWNER", employeeId + " does not own " + bookingId);
    }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) { }

class BookingService {
    private final Map<String, Booking> byId = new LinkedHashMap<>();
    private final DoubleSupplier clock;     // current hour, injected
    private int nextId = 1;

    BookingService(DoubleSupplier clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    String book(String employeeId, String roomId, double start, double end) {
        Objects.requireNonNull(roomId, "roomId");
        String id = "B" + nextId++;
        byId.put(id, new Booking(id, roomId, employeeId, start, end));
        return id;
    }

    void cancel(String bookingId, String employeeId) {
        Booking b = byId.get(bookingId);
        if (b == null) {                    // unknown id (c11-t04)
            throw new IllegalArgumentException("unknown " + bookingId);
        }
        if (!Objects.equals(b.employeeId(), employeeId)) {   // c11-t04
            throw new NotOwnerException(bookingId, employeeId);
        }
        if (b.end() <= clock.getAsDouble()) {   // the fix for FB-4
            throw new InvalidSlotException(bookingId + " already ended");
        }
        byId.remove(bookingId);
    }
}
