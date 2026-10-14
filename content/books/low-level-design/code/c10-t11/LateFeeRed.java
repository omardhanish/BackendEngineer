import java.util.ArrayList;
import java.util.List;

public class LateFeeRed {
    public static void main(String[] args) {
        LateFee fee = new LateFee();
        check("on time costs nothing", fee.cents(0) == 0);
        check("grace days cost nothing", fee.cents(2) == 0);
        // Just written, before any code supports it.
        check("third day costs 75", fee.cents(3) == 75);
        System.out.println(FAILED.size() + " failing " + FAILED);
    }

    static final List<String> FAILED = new ArrayList<>();

    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) {
            FAILED.add(name);
        }
    }
}

// The simplest code that made the first two tests pass.
// It is "wrong", but no test has demanded more yet.
class LateFee {
    int cents(int daysLate) {
        return 0;
    }
}
