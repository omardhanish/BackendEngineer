import java.util.List;

public class PolicyDemo {
    public static void main(String[] args) {
        List<Booking> existing = List.of(
            new Booking("BK1", "R-101", "E7", 10, 11));
        ConflictPolicy policy = new OverlapPolicy();
        double[][] asks = { {9, 10}, {10.5, 12}, {11, 12} };
        for (double[] a : asks) {
            Booking c = new Booking("new", "R-101", "E9", a[0], a[1]);
            System.out.println(a[0] + "-" + a[1] + " conflicts: "
                + policy.conflicts(c, existing));
        }
    }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) {}

interface ConflictPolicy {
    boolean conflicts(Booking candidate, List<Booking> existing);
}

class OverlapPolicy implements ConflictPolicy {
    @Override
    public boolean conflicts(Booking candidate, List<Booking> existing) {
        return existing.stream().anyMatch(b ->
            b.roomId().equals(candidate.roomId())
            && candidate.start() < b.end()
            && b.start() < candidate.end());
    }
}
