import java.util.*;

public class CopyStateChecks {
    private static int failed = 0;

    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failed++;
    }

    public static void main(String[] args) {
        check("R1 a free copy can be lent",
                CopyState.AVAILABLE.canMoveTo(CopyState.ON_LOAN));
        check("R2 a lent copy cannot be lent again",
                !CopyState.ON_LOAN.canMoveTo(CopyState.ON_LOAN));
        check("R3 a lost copy is never lent",
                !CopyState.LOST.canMoveTo(CopyState.ON_LOAN));
        check("R4 a reserved copy goes on loan or back",
                CopyState.RESERVED.next().equals(
                        EnumSet.of(CopyState.AVAILABLE, CopyState.ON_LOAN)));
        check("R5 every state has a rule", Arrays.stream(CopyState.values())
                .allMatch(s -> !s.next().isEmpty()));
        FinePolicy grace = daysLate -> Math.max(0, daysLate - 2) * 5;
        check("R6 two days late is free", grace.fine(2) == 0);
        check("R7 five days late costs 15", grace.fine(5) == 15);
        System.out.println(failed == 0 ? "all requirements hold"
                : failed + " requirement(s) broken");
    }
}

interface FinePolicy { int fine(int daysLate); }

enum CopyState {
    AVAILABLE, RESERVED, ON_LOAN, LOST;

    private static final Map<CopyState, Set<CopyState>> NEXT =
            new EnumMap<>(CopyState.class);
    static {
        NEXT.put(AVAILABLE, EnumSet.of(RESERVED, ON_LOAN, LOST));
        NEXT.put(RESERVED, EnumSet.of(AVAILABLE, ON_LOAN));
        NEXT.put(ON_LOAN, EnumSet.of(AVAILABLE, LOST));
        NEXT.put(LOST, EnumSet.of(AVAILABLE));        // found again
    }

    Set<CopyState> next() {
        Set<CopyState> to = NEXT.getOrDefault(this, Set.of());
        return Collections.unmodifiableSet(to);   // missing rule: empty
    }

    boolean canMoveTo(CopyState target) {
        return next().contains(target);
    }
}
