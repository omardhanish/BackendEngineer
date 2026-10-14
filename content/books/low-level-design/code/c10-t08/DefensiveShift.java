import java.util.*;

public class DefensiveShift {
    public static void main(String[] args) {
        List<String> staff = new ArrayList<>(List.of("ann", "bob"));
        var leaky = new LeakyShift(staff, -3);
        var safe = new SafeShift(staff, 8);
        staff.clear();                     // the caller reuses its list
        System.out.println("leaky " + leaky.staff() + " " + leaky.hours());
        System.out.println("safe  " + safe.staff() + " " + safe.hours());
        attempt(() -> safe.staff().add("eve"));
        attempt(() -> new SafeShift(List.of("ann"), -3));
        attempt(() -> new SafeShift(List.of(), 8));
        attempt(() -> new SafeShift(Arrays.asList("ann", null), 8));
    }
    static void attempt(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            System.out.println("rejected: " + e.getClass().getSimpleName()
                    + (e.getMessage() == null ? "" : " " + e.getMessage()));
        }
    }
}
// Trusts every caller: keeps their list, accepts any number.
final class LeakyShift {
    private final List<String> staff;
    private final int hours;
    LeakyShift(List<String> staff, int hours) {
        this.staff = staff;
        this.hours = hours;
    }
    List<String> staff() { return staff; }
    int hours() { return hours; }
}
// Checks at the boundary, copies in, hands out an unmodifiable list.
final class SafeShift {
    private final List<String> staff;
    private final int hours;
    SafeShift(List<String> staff, int hours) {
        Objects.requireNonNull(staff, "staff");
        if (hours < 1 || hours > 12)
            throw new IllegalArgumentException("hours 1..12, got " + hours);
        this.staff = List.copyOf(staff);   // also rejects null elements
        if (this.staff.isEmpty())
            throw new IllegalArgumentException("shift needs staff");
        this.hours = hours;
    }
    List<String> staff() { return staff; }   // already unmodifiable
    int hours() { return hours; }
}
