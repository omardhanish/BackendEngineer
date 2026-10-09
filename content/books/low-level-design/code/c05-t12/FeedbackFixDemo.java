import java.util.*;

public class FeedbackFixDemo {
    static int failed = 0;

    public static void main(String[] args) {
        var held = List.of(new Booking("BK1", "R-101", "E7", 10, 11));
        var nextHour = new Booking("BK2", "R-101", "E9", 11, 12);
        var inside = new Booking("BK3", "R-101", "E9", 10.25, 10.75);

        ConflictPolicy before = (c, ex) -> ex.stream()
            .anyMatch(b -> c.start() <= b.end() && b.start() <= c.end());
        ConflictPolicy after = (c, ex) -> ex.stream()
            .anyMatch(b -> c.start() < b.end() && b.start() < c.end());

        System.out.println("-- before the fix");
        check("back-to-back is allowed", !before.conflicts(nextHour, held));
        check("overlap is refused", before.conflicts(inside, held));
        failed = 0;
        System.out.println("-- after the fix");
        check("back-to-back is allowed", !after.conflicts(nextHour, held));
        check("overlap is refused", after.conflicts(inside, held));
        System.out.println("failed after the fix: " + failed);
    }

    static void check(String name, boolean ok) {
        if (!ok) failed++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) {}

interface ConflictPolicy {
    boolean conflicts(Booking candidate, List<Booking> existing);
}
