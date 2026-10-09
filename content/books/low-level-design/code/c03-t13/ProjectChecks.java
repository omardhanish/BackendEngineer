import java.util.*;

public class ProjectChecks {
    static int failed = 0;

    static void check(String requirement, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + requirement);
        if (!ok) failed++;
    }

    public static void main(String[] args) {
        Lot lot = new Lot(2);
        Optional<Ticket> first = lot.park("CAR-1");
        check("R1 a free spot gives a ticket", first.isPresent());
        check("R2 a parked car cannot park again",
                lot.park("CAR-1").isEmpty());
        lot.park("CAR-2");
        check("R3 a full lot refuses", lot.park("CAR-3").isEmpty());
        lot.leave(first.orElseThrow());
        check("R4 leaving frees the spot", lot.park("CAR-3").isPresent());
        System.out.println(failed == 0 ? "all met" : failed + " failed");
    }
}

record Ticket(String plate, int spot) {}

class Lot {
    private final String[] spots;       // plate per spot, null when free

    Lot(int size) { spots = new String[size]; }

    synchronized Optional<Ticket> park(String plate) {
        if (Arrays.asList(spots).contains(plate)) return Optional.empty();
        for (int i = 0; i < spots.length; i++) {
            if (spots[i] == null) {
                spots[i] = plate;
                return Optional.of(new Ticket(plate, i));
            }
        }
        return Optional.empty();
    }

    synchronized void leave(Ticket t) { spots[t.spot()] = null; }
}
