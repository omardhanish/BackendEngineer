import java.util.ArrayList;
import java.util.List;

public class HardCodedBooking {
    public static void main(String[] args) {
        BookingService exact = new BookingService("CLEANING_GAP");
        exact.book("ana", "R1", 9.0, 10.0);
        exact.book("raj", "R1", 10.0, 11.0);

        BookingService typo = new BookingService("CLEANING-GAP");
        typo.book("ana", "R1", 9.0, 10.0);
        typo.book("raj", "R1", 10.0, 11.0);
    }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) {}

class BookingService {
    private final String mode;
    private final List<Booking> bookings = new ArrayList<>();

    BookingService(String mode) { this.mode = mode; }

    void book(String employeeId, String roomId, double start, double end) {
        double gap = 0;
        if (mode.equals("CLEANING_GAP")) {
            gap = 0.25;
        } // else if (mode.equals("VIP_ROOMS")) ... every rule lands here
        for (Booking b : bookings) {
            if (b.roomId().equals(roomId)
                    && start < b.end() + gap && b.start() < end + gap) {
                System.out.println("rejected " + employeeId + " " + mode);
                return;
            }
        }
        Booking booking = new Booking("B" + (bookings.size() + 1),
                roomId, employeeId, start, end);
        bookings.add(booking);
        System.out.println("email: " + employeeId + " got " + roomId);
        System.out.println("audit: " + booking.id() + " [" + mode + "]");
    }
}
