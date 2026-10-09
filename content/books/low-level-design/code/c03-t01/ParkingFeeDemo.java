import java.util.List;

public class ParkingFeeDemo {
    public static void main(String[] args) {
        List<FeeRule> rules = List.of(new Hourly(20),
                new FirstHourFree(20), new CappedHourly(20, 100));
        for (FeeRule rule : rules) {
            System.out.println(rule.name() + ": 3h=" + rule.fee(3)
                    + " 9h=" + rule.fee(9));
        }
    }
}

// The lot asks a FeeRule for the price; it never knows which rule it holds.
interface FeeRule {
    int fee(int hours);

    default String name() { return getClass().getSimpleName(); }
}

record Hourly(int rate) implements FeeRule {
    public int fee(int hours) { return hours * rate; }
}

record FirstHourFree(int rate) implements FeeRule {
    public int fee(int hours) { return Math.max(0, hours - 1) * rate; }
}

record CappedHourly(int rate, int cap) implements FeeRule {
    public int fee(int hours) { return Math.min(cap, hours * rate); }
}
