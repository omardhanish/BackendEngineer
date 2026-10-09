import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class SplitDemo {
    public static void main(String[] args) {
        Ledger ledger = new Ledger(); // amounts are whole cents
        ledger.add("ana", 10000, new Equal(List.of("ana", "ben", "cy")));
        ledger.add("cy", 4500, new Exact(Map.of("ana", 1500L, "ben", 3000L)));
        try {
            ledger.add("ben", 1000, new Exact(Map.of("ana", 600L)));
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        System.out.println(ledger.balances());
    }
}

interface SplitStrategy {
    Map<String, Long> shares(long total); // who owes how much of total
}

record Equal(List<String> people) implements SplitStrategy {
    public Map<String, Long> shares(long total) {
        Map<String, Long> out = new LinkedHashMap<>();
        long each = total / people.size(), left = total % people.size();
        for (int i = 0; i < people.size(); i++)
            out.put(people.get(i), each + (i < left ? 1 : 0)); // spread rest
        return out;
    }
}

record Exact(Map<String, Long> amounts) implements SplitStrategy {
    public Map<String, Long> shares(long total) {
        long sum = amounts.values().stream().mapToLong(Long::longValue).sum();
        if (sum != total)
            throw new IllegalArgumentException(sum + " != " + total);
        return amounts;
    }
}

final class Ledger {
    private final Map<String, Long> net = new TreeMap<>(); // + owed, - owes
    void add(String payer, long total, SplitStrategy split) {
        Map<String, Long> shares = split.shares(total); // validate first
        net.merge(payer, total, Long::sum);
        shares.forEach((who, s) -> net.merge(who, -s, Long::sum));
    }
    Map<String, Long> balances() { return new TreeMap<>(net); }
}
