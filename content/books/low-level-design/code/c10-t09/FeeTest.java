import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

public class FeeTest {
    static int passed, failed;
    static final LocalDate DUE = LocalDate.of(2024, 3, 10);

    public static void main(String[] args) {
        // Arrange: a clock frozen 5 days after the due date.
        Instant day5 = DUE.plusDays(5).atStartOfDay(ZoneOffset.UTC).toInstant();
        Clock frozen = Clock.fixed(day5, ZoneOffset.UTC);
        var desk = new ReturnDesk(new LateFee(), frozen);
        // Act + Assert: one behaviour per check.
        check("fee uses today's date", desk.feeToday(DUE) == 125);
        check("grace edge is free",
                new LateFee().cents(DUE, DUE.plusDays(2)) == 0);
        checkThrows("null due date is rejected",
                NullPointerException.class, () -> desk.feeToday(null));
        System.out.println(passed + " passed, " + failed + " failed");
    }
    static void check(String name, boolean ok) {
        if (ok) passed++; else failed++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
    static void checkThrows(String name, Class<?> type, Runnable action) {
        try {
            action.run();
            check(name + " (nothing thrown)", false);
        } catch (RuntimeException e) {
            check(name, type.isInstance(e));
        }
    }
}
final class LateFee {
    static final int GRACE_DAYS = 2, CENTS_PER_DAY = 25, CAP_CENTS = 500;
    long cents(LocalDate due, LocalDate returned) {
        Objects.requireNonNull(due, "due");
        Objects.requireNonNull(returned, "returned");
        long late = ChronoUnit.DAYS.between(due, returned);
        if (late <= GRACE_DAYS) return 0;
        return Math.min(late * CENTS_PER_DAY, CAP_CENTS);
    }
}
// "Today" is injected, so a test can freeze time instead of waiting for it.
final class ReturnDesk {
    private final LateFee fee;
    private final Clock clock;
    ReturnDesk(LateFee fee, Clock clock) {
        this.fee = Objects.requireNonNull(fee, "fee");
        this.clock = Objects.requireNonNull(clock, "clock");
    }
    long feeToday(LocalDate due) {
        return fee.cents(due, LocalDate.now(clock));
    }
}
