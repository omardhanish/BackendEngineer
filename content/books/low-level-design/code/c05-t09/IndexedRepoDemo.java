import java.util.*;

public class IndexedRepoDemo {
    public static void main(String[] args) {
        var list = new ListBookings();
        var tree = new TreeBookings();
        for (int i = 0; i < 16; i++) {          // 08:00 to 16:00, full
            var b = new Booking("BK" + i, 8 + i * 0.5, 8.5 + i * 0.5);
            list.save(b);
            tree.save(b);
        }
        System.out.println("list taken=" + list.overlaps(15.25, 15.75)
            + " checks=" + list.checks);
        System.out.println("tree taken=" + tree.overlaps(15.25, 15.75)
            + " checks=" + tree.checks);
    }
}

record Booking(String id, double start, double end) {}

class ListBookings {                       // before: scan every booking
    private final List<Booking> saved = new ArrayList<>();
    int checks;
    void save(Booking b) { saved.add(b); }
    boolean overlaps(double start, double end) {
        for (Booking b : saved) {
            checks++;
            if (start < b.end() && b.start() < end) return true;
        }
        return false;
    }
}

class TreeBookings {             // after: sorted by start, never overlapping
    private final TreeMap<Double, Booking> byStart = new TreeMap<>();
    int checks;
    void save(Booking b) { byStart.put(b.start(), b); }
    boolean overlaps(double start, double end) {
        var before = byStart.floorEntry(start);    // starts at or before
        var after = byStart.higherEntry(start);    // first one after
        checks += 2;
        return (before != null && before.getValue().end() > start)
            || (after != null && after.getKey() < end);
    }
}
