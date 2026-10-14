import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class BuggyFeeTest {
    static int passed, failed;
    static final LocalDate DUE = LocalDate.of(2024, 3, 10);

    public static void main(String[] args) {
        var f = new LateFee();
        // One behaviour per test, named for the rule it pins down.
        check("returned early is free", f.cents(DUE, DUE.minusDays(1)) == 0);
        check("on the due date is free", f.cents(DUE, DUE) == 0);
        check("last grace day is free", f.cents(DUE, DUE.plusDays(2)) == 0);
        check("first charged day: 3 x 25", f.cents(DUE, DUE.plusDays(3)) == 75);
        check("cap reached at 20 days", f.cents(DUE, DUE.plusDays(20)) == 500);
        check("never above the cap", f.cents(DUE, DUE.plusDays(40)) == 500);
        System.out.println(passed + " passed, " + failed + " failed");
    }
    // Tiny stand-in for JUnit's assertTrue: record and report.
    static void check(String name, boolean ok) {
        if (ok) passed++; else failed++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}
// Rule: free up to 2 days late, then 25 cents per late day, cap 500.
final class LateFee {
    static final int GRACE_DAYS = 2, CENTS_PER_DAY = 25, CAP_CENTS = 500;
    long cents(LocalDate due, LocalDate returned) {
        long late = ChronoUnit.DAYS.between(due, returned);
        if (late < GRACE_DAYS) return 0;       // bug: should be <=
        return Math.min(late * CENTS_PER_DAY, CAP_CENTS);
    }
}
