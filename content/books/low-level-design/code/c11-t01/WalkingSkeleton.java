import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class WalkingSkeleton {
    public static void main(String[] args) {
        BookingService service = new BookingService();
        System.out.println(service.book("e1", "R1", 9.0, 10.0));
        System.out.println(service.book("e2", "R1", 9.5, 10.5));
        System.out.println(service.book("e2", "R1", 10.0, 11.0));
        System.out.println(service.book("e3", "R2", 9.0, 10.0));
        System.out.println("bookings held: " + service.count());
    }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) {
    Booking {
        Objects.requireNonNull(roomId, "roomId");
        Objects.requireNonNull(employeeId, "employeeId");
        if (start >= end) {
            throw new IllegalArgumentException("start must be before end");
        }
    }

    boolean overlaps(Booking other) {
        return roomId.equals(other.roomId)
            && start < other.end && other.start < end;
    }
}

// Skeleton only: one class, a list, strings instead of exceptions.
class BookingService {
    private final List<Booking> bookings = new ArrayList<>();

    String book(String employeeId, String roomId, double start, double end) {
        Booking candidate = new Booking("B" + (bookings.size() + 1),
            roomId, employeeId, start, end);
        for (Booking existing : bookings) {
            if (candidate.overlaps(existing)) {
                return "REJECTED " + roomId + " " + start + "-" + end
                    + " clashes with " + existing.id();
            }
        }
        bookings.add(candidate);
        return "BOOKED " + candidate.id() + " " + roomId
            + " " + start + "-" + end;
    }

    int count() {
        return bookings.size();
    }
}
