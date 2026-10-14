import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class BookingRulesTest {
    private static int passed, failed;

    public static void main(String[] args) {
        expect("back-to-back slot is free", "OK",
                s -> s.book("raj", "R1", 10.0, 11.0));
        expect("partial overlap is taken", "ROOM_TAKEN",
                s -> s.book("raj", "R1", 9.5, 10.5));
        expect("same hour, other room is free", "OK",
                s -> s.book("raj", "R2", 9.0, 10.0));
        expect("zero-length slot is invalid", "INVALID_SLOT",
                s -> s.book("raj", "R1", 11.0, 11.0));
        expect("only the owner may cancel", "NOT_OWNER",
                s -> s.cancel("B1", "raj"));
        System.out.println(passed + " passed, " + failed + " failed");
    }
    static void expect(String name, String code, Consumer<BookingService> act) {
        BookingService s = new BookingService();   // fresh state per test
        s.book("ana", "R1", 9.0, 10.0);            // arrange: B1, 09:00-10:00
        String got;
        try { act.accept(s); got = "OK"; }          // act
        catch (BookingException e) { got = e.code(); }
        check(name + " (" + got + ")", got.equals(code)); // assert
    }
    static void check(String name, boolean ok) {
        if (ok) passed++; else failed++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
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

class BookingService {
    private final List<Booking> bookings = new ArrayList<>();

    Booking book(String employeeId, String roomId, double start, double end) {
        if (start < 0 || end > 24 || start >= end) {
            throw new InvalidSlotException();
        }
        for (Booking b : bookings) {
            if (b.roomId().equals(roomId) && start < b.end() && b.start() < end)
                throw new RoomTakenException();
        }
        Booking b = new Booking("B" + (bookings.size() + 1),
                roomId, employeeId, start, end);
        bookings.add(b);
        return b;
    }
    void cancel(String bookingId, String employeeId) {
        Booking b = bookings.stream().filter(x -> x.id().equals(bookingId))
                .findFirst().orElseThrow();
        if (!b.employeeId().equals(employeeId)) throw new NotOwnerException();
        bookings.remove(b);
    }
}
