import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.TreeMap;

public class SimplifyDebts {
    public static void main(String[] args) {
        BalanceSheet sheet = new BalanceSheet();
        sheet.record("Asha", Map.of("Asha", 3000L, "Ben", 3000L,
                "Chen", 3000L, "Dev", 3000L));
        sheet.record("Ben", Map.of("Ben", 3000L, "Chen", 3000L));
        sheet.record("Dev", Map.of("Asha", 2000L, "Dev", 2000L));
        System.out.println("net: " + sheet.net());
        sheet.settle().forEach(System.out::println);
    }
}

record Transfer(String from, String to, long cents) {}
record Balance(String user, long cents) {}

final class BalanceSheet {
    private final Map<String, Long> net = new TreeMap<>();  // + means owed

    /** The payer gains each share, each user owes theirs. */
    void record(String payer, Map<String, Long> shares) {
        if (shares.isEmpty() || shares.values().stream().anyMatch(c -> c < 0))
            throw new IllegalArgumentException("need non-negative shares");
        shares.forEach((user, cents) -> {
            net.merge(payer, cents, Long::sum);
            net.merge(user, -cents, Long::sum);
        });
    }

    Map<String, Long> net() { return new TreeMap<>(net); }

    /** Greedy: largest debtor pays largest creditor, ties by name. */
    List<Transfer> settle() {
        long sum = net.values().stream().mapToLong(Long::longValue).sum();
        if (sum != 0) throw new IllegalStateException("nets sum to " + sum);
        Comparator<Balance> biggest = Comparator.comparingLong(Balance::cents)
                .reversed().thenComparing(Balance::user);
        PriorityQueue<Balance> owing = new PriorityQueue<>(biggest);
        PriorityQueue<Balance> owed = new PriorityQueue<>(biggest);
        net.forEach((user, cents) -> {
            if (cents < 0) owing.add(new Balance(user, -cents));
            if (cents > 0) owed.add(new Balance(user, cents));
        });
        List<Transfer> out = new ArrayList<>();
        while (!owing.isEmpty()) {
            Balance debtor = owing.poll(), creditor = owed.poll();
            long amount = Math.min(debtor.cents(), creditor.cents());
            out.add(new Transfer(debtor.user(), creditor.user(), amount));
            if (debtor.cents() > amount)        // re-queue what is left
                owing.add(new Balance(debtor.user(), debtor.cents() - amount));
            if (creditor.cents() > amount)
                owed.add(new Balance(creditor.user(),
                        creditor.cents() - amount));
        }
        return out;                               // at most n - 1 transfers
    }
}
