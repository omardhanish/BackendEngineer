import java.util.ArrayList;
import java.util.List;

public class LateFeeGreen {
    public static void main(String[] args) {
        LateFee fee = new LateFee();
        check("on time costs nothing", fee.cents(0) == 0);
        check("grace days cost nothing", fee.cents(2) == 0);
        check("third day costs 75", fee.cents(3) == 75);
        check("each late day adds 25", fee.cents(5) == 125);
        check("just under the cap", fee.cents(19) == 475);
        check("cap reached exactly", fee.cents(20) == 500);
        check("huge delay stays capped",
            fee.cents(90_000_000) == 500);
        check("negative days rejected", rejects(() -> fee.cents(-1)));
        System.out.println(FAILED.size() + " failing");
    }

    static final List<String> FAILED = new ArrayList<>();

    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) {
            FAILED.add(name);
        }
    }

    static boolean rejects(Runnable action) {
        try {
            action.run();
            return false;
        } catch (IllegalArgumentException expected) {
            return true;
        }
    }
}

// After several red-green-refactor cycles. Names replaced magic numbers
// during refactor steps, and the long multiply came from a failing test.
final class LateFee {
    private static final int GRACE_DAYS = 2;
    private static final long CENTS_PER_DAY = 25;
    private static final long CAP_CENTS = 500;

    int cents(int daysLate) {
        if (daysLate < 0) {
            throw new IllegalArgumentException(
                "daysLate must be >= 0, was " + daysLate);
        }
        if (daysLate <= GRACE_DAYS) {
            return 0;                       // grace period is free
        }
        // Past grace, every late day is charged, as on the testing page.
        return (int) Math.min(CAP_CENTS, daysLate * CENTS_PER_DAY);
    }
}
