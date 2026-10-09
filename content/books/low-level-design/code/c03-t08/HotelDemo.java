import java.time.LocalDate;
import java.util.*;

public class HotelDemo {
    static final LocalDate MAR_10 = LocalDate.of(2026, 3, 10);
    public static void main(String[] args) {
        var hotel = new ReservationService(List.of(new Room("101", Type.DOUBLE),
                new Room("102", Type.DOUBLE), new Room("201", Type.SUITE)));
        book(hotel, "ana", 0, 3);
        book(hotel, "ben", 1, 2);
        book(hotel, "cy", 3, 5);
        book(hotel, "dee", 1, 4);
    }
    static void book(ReservationService hotel, String guest, int from, int to) {
        var stay = new Stay(MAR_10.plusDays(from), MAR_10.plusDays(to));
        var r = hotel.book(guest, Type.DOUBLE, stay);
        System.out.println(guest + " -> "
                + r.map(Reservation::room).orElse("no room"));
    }
}

enum Type { DOUBLE, SUITE }
record Room(String number, Type type) {}
record Reservation(String guest, String room, Stay stay) {}

// half-open [in, out): the check-out day is free for the next guest
record Stay(LocalDate in, LocalDate out) {
    Stay {
        if (!in.isBefore(out)) throw new IllegalArgumentException("empty stay");
    }
    boolean overlaps(Stay o) {
        return in.isBefore(o.out) && o.in.isBefore(out);
    }
}

final class ReservationService {
    private final List<Room> rooms;
    private final List<Reservation> reservations = new ArrayList<>();
    ReservationService(List<Room> rooms) { this.rooms = List.copyOf(rooms); }
    // first room of the type with no overlapping reservation
    synchronized Optional<Reservation> book(String guest, Type type, Stay s) {
        Optional<Reservation> res = rooms.stream()
                .filter(room -> room.type() == type)
                .filter(room -> reservations.stream().noneMatch(r ->
                        r.room().equals(room.number()) && r.stay().overlaps(s)))
                .findFirst()
                .map(room -> new Reservation(guest, room.number(), s));
        res.ifPresent(reservations::add);
        return res;
    }
}
