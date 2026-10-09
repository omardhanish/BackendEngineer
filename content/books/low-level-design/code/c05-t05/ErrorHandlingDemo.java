import java.util.*;

public class ErrorHandlingDemo {
    static final Map<String, Integer> metrics = new TreeMap<>();
    public static void main(String[] args) {
        var svc = new BookingService();
        double[][] asks = { {10, 11}, {10.5, 12}, {15, 14}, {11, 12} };
        for (double[] a : asks) {
            String slot = "slot=" + a[0] + "-" + a[1];
            try {
                Booking b = svc.book("E7", "R-101", a[0], a[1]);
                log("INFO", "booked", "id=" + b.id() + " " + slot);
                metrics.merge("booked", 1, Integer::sum);
            } catch (BookingException e) {
                log("WARN", "refused", "code=" + e.code() + " " + slot);
                metrics.merge(e.code(), 1, Integer::sum);
            }
        }
        System.out.println("metrics " + metrics);
    }
    static void log(String level, String event, String fields) {
        System.out.println(level + " event=" + event + " " + fields);
    }
}

abstract class BookingException extends RuntimeException {
    BookingException(String message) { super(message); }
    abstract String code();
}
class RoomTakenException extends BookingException {
    RoomTakenException(String roomId) { super(roomId + " is taken"); }
    String code() { return "ROOM_TAKEN"; }
}
class InvalidSlotException extends BookingException {
    InvalidSlotException(double s, double e) {
        super("bad slot " + s + "-" + e);
    }
    String code() { return "INVALID_SLOT"; }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) {}
class BookingService {
    private final List<Booking> saved = new ArrayList<>();
    Booking book(String employeeId, String roomId, double start, double end) {
        if (end <= start) throw new InvalidSlotException(start, end);
        boolean taken = saved.stream().anyMatch(b -> b.roomId().equals(roomId)
            && start < b.end() && b.start() < end);
        if (taken) throw new RoomTakenException(roomId);
        String id = "BK" + (saved.size() + 1);
        Booking b = new Booking(id, roomId, employeeId, start, end);
        saved.add(b);
        return b;
    }
}
