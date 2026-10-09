import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class SeatHoldDemo {
    public static void main(String[] args) {
        ShowSeats show = new ShowSeats(List.of("A1", "A2"), 10); // 10 min hold
        System.out.println("ana holds A1: " + show.hold("ana", "A1", 0));
        System.out.println("ben holds A1: " + show.hold("ben", "A1", 5));
        System.out.println("ben holds A1: " + show.hold("ben", "A1", 12));
        System.out.println("ana confirms: " + show.confirm("ana", "A1", 13));
        System.out.println("ben confirms: " + show.confirm("ben", "A1", 13));
        System.out.println("A1 is " + show.state("A1"));
    }
}

enum SeatState { FREE, HELD, BOOKED }

final class Seat {
    SeatState state = SeatState.FREE;
    String holder;
    int expiresAt; // minutes, on a clock the caller passes in
}

final class ShowSeats {
    private final Map<String, Seat> seats = new TreeMap<>();
    private final int holdMinutes;

    ShowSeats(List<String> ids, int holdMinutes) {
        ids.forEach(id -> seats.put(id, new Seat()));
        this.holdMinutes = holdMinutes;
    }

    synchronized boolean hold(String user, String id, int now) {
        Seat s = seats.get(id);
        if (s.state == SeatState.HELD && now >= s.expiresAt)
            s.state = SeatState.FREE; // an expired hold frees itself
        if (s.state != SeatState.FREE) return false;
        s.state = SeatState.HELD;
        s.holder = user;
        s.expiresAt = now + holdMinutes;
        return true;
    }

    synchronized boolean confirm(String user, String id, int now) {
        Seat s = seats.get(id); // only the live holder may pay and book
        if (s.state != SeatState.HELD || !s.holder.equals(user)
                || now >= s.expiresAt) return false;
        s.state = SeatState.BOOKED;
        return true;
    }

    synchronized SeatState state(String id) { return seats.get(id).state; }
}
