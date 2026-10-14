import java.util.ArrayList;
import java.util.List;

/** Runs each case the BookingService Javadoc describes. */
public class BookingContractDemo {
    public static void main(String[] args) {
        BookingService s = new BookingService();
        System.out.println(s.book("ana", "R1", 9.0, 10.0));
        attempt(() -> s.book("raj", "R1", 9.5, 10.5));
        attempt(() -> s.book("raj", "R1", 10.0, 11.0));
        attempt(() -> s.book("raj", "R1", 10.0, 9.0));
        attempt(() -> s.cancel("B1", "raj"));
        attempt(() -> s.cancel("B1", "ana"));
    }
    static void attempt(Runnable call) {
        try { call.run(); System.out.println("ok"); }
        catch (BookingException e) { System.out.println(e.code()); }
    }
}
record Booking(String id, String roomId, String employeeId,
               double start, double end) {}
abstract class BookingException extends RuntimeException {
    abstract String code();
}
class RoomTakenException extends BookingException {
    String code() { return "ROOM_TAKEN"; } }
class InvalidSlotException extends BookingException {
    String code() { return "INVALID_SLOT"; } }
class NotOwnerException extends BookingException {
    String code() { return "NOT_OWNER"; } }
/** Books meeting rooms. Hours are doubles: 9.5 means 09:30. */
class BookingService {
    private final List<Booking> bookings = new ArrayList<>();
    /**
     * Books {@code roomId} for the half-open slot [start, end).
     * A slot ending at 10.0 does not clash with one starting at 10.0.
     * @return the saved booking, with a new id such as "B1"
     * @throws InvalidSlotException if start is not before end
     * @throws RoomTakenException if the slot overlaps a booking
     */
    Booking book(String employeeId, String roomId, double start, double end) {
        if (start >= end) throw new InvalidSlotException();
        for (Booking b : bookings) {
            if (b.roomId().equals(roomId) && start < b.end() && b.start() < end)
                throw new RoomTakenException();
        }
        Booking b = new Booking("B" + (bookings.size() + 1),
                roomId, employeeId, start, end);
        bookings.add(b);
        return b;
    }
    /** @throws NotOwnerException unless the booker cancels
     *  @throws IllegalArgumentException if the id is unknown */
    void cancel(String bookingId, String employeeId) {
        Booking b = bookings.stream().filter(x -> x.id().equals(bookingId))
                .findFirst().orElseThrow(() ->
                        new IllegalArgumentException("unknown " + bookingId));
        if (!b.employeeId().equals(employeeId)) throw new NotOwnerException();
        bookings.remove(b);
    }
}
