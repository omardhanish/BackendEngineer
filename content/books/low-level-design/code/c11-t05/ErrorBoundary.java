import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

public class ErrorBoundary {
    public static void main(String[] args) {
        Metrics metrics = new Metrics();
        BookingEndpoint api =
            new BookingEndpoint(new BookingService(), new Log(), metrics);
        System.out.println("-> " + api.book("e1", "R1", 9.0, 10.0));
        System.out.println("-> " + api.book("e2", "R1", 9.5, 10.5));
        System.out.println("-> " + api.book("e2", "R1", 11.0, 10.0));
        System.out.println("-> " + api.book("e2", "R9", 13.0, 14.0));
        System.out.println("-> " + api.book(null, "R1", 13.0, 14.0));
        System.out.println("metrics " + metrics.snapshot());
    }
}

class BookingEndpoint {
    private final BookingService service;
    private final Log log;
    private final Metrics metrics;

    BookingEndpoint(BookingService service, Log log, Metrics metrics) {
        this.service = Objects.requireNonNull(service);
        this.log = Objects.requireNonNull(log);
        this.metrics = Objects.requireNonNull(metrics);
    }

    String book(String employeeId, String roomId, double start, double end) {
        String ctx = "employee=" + employeeId + " room=" + roomId
            + " slot=" + start + "-" + end;
        try {
            String id = service.book(employeeId, roomId, start, end);
            metrics.increment("booking.created");
            log.line("INFO", "booking.created", "id=" + id + " " + ctx);
            return "201 " + id;
        } catch (BookingException e) {
            metrics.increment("booking.rejected." + e.code());
            log.line("WARN", "booking.rejected",
                "code=" + e.code() + " " + ctx);
            int status = switch (e.code()) {
                case "INVALID_SLOT" -> 400;
                case "NOT_OWNER" -> 403;
                default -> 409;
            };
            return status + " " + e.code();
        } catch (IllegalArgumentException e) {  // unknown room or booking id
            metrics.increment("booking.not_found");
            log.line("WARN", "booking.not_found", ctx);
            return "404 NOT_FOUND";
        } catch (RuntimeException e) {
            metrics.increment("booking.error");
            log.line("ERROR", "booking.failed",
                "type=" + e.getClass().getSimpleName() + " " + ctx);
            return "500 INTERNAL";
        }
    }
}

// Trimmed service: it throws and never logs. Full rules are in c11-t04.
class BookingService {
    private final List<double[]> taken = new ArrayList<>();

    String book(String employeeId, String roomId, double start, double end) {
        Objects.requireNonNull(employeeId, "employeeId");
        if (!"R1".equals(roomId)) {     // c11-t04: unknown ids throw IAE
            throw new IllegalArgumentException("unknown room " + roomId);
        }
        if (start < 0 || end > 24 || start >= end) {
            throw new InvalidSlotException("bad slot " + start + "-" + end);
        }
        for (double[] t : taken) {
            if (start < t[1] && t[0] < end) {
                throw new RoomTakenException(roomId + " is taken then");
            }
        }
        taken.add(new double[] {start, end});
        return "B" + taken.size();
    }
}

class Log {   // stands in for SLF4J; no timestamps, so output is stable
    void line(String level, String event, String fields) {
        System.out.println(level + " event=" + event + " " + fields);
    }
}

class Metrics {
    private final Map<String, Integer> counters = new TreeMap<>();

    void increment(String name) {
        counters.merge(name, 1, Integer::sum);
    }

    Map<String, Integer> snapshot() {
        return new TreeMap<>(counters);
    }
}

abstract class BookingException extends RuntimeException {
    BookingException(String message) { super(message); }
    abstract String code();
}

class RoomTakenException extends BookingException {
    RoomTakenException(String m) { super(m); }
    String code() { return "ROOM_TAKEN"; }
}

class InvalidSlotException extends BookingException {
    InvalidSlotException(String m) { super(m); }
    String code() { return "INVALID_SLOT"; }
}

class NotOwnerException extends BookingException {
    NotOwnerException(String m) { super(m); }
    String code() { return "NOT_OWNER"; }
}
