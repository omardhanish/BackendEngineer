import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class PairwiseDebts {
    public static void main(String[] args) {
        List<Expense> expenses = List.of(
                new Expense("Asha", Map.of("Asha", 3000L, "Ben", 3000L,
                        "Chen", 3000L, "Dev", 3000L)),
                new Expense("Ben", Map.of("Ben", 3000L, "Chen", 3000L)),
                new Expense("Dev", Map.of("Asha", 2000L, "Dev", 2000L)));

        // debtor -> (creditor -> cents), one entry per pair that met
        Map<String, Map<String, Long>> owes = new TreeMap<>();
        for (Expense e : expenses) {
            e.shares().forEach((user, cents) -> {
                if (user.equals(e.paidBy())) return;     // own share
                owes.computeIfAbsent(user, k -> new TreeMap<>())
                        .merge(e.paidBy(), cents, Long::sum);
            });
        }
        int transfers = 0;
        for (var debtor : owes.entrySet()) {
            for (var debt : debtor.getValue().entrySet()) {
                System.out.println(debtor.getKey() + " pays "
                        + debt.getKey() + " " + debt.getValue());
                transfers++;
            }
        }
        System.out.println("pairwise transfers: " + transfers);

        Map<String, Long> net = new TreeMap<>();         // + means owed
        for (Expense e : expenses) {
            e.shares().forEach((user, cents) -> {
                net.merge(e.paidBy(), cents, Long::sum);
                net.merge(user, -cents, Long::sum);
            });
        }
        long sum = net.values().stream().mapToLong(Long::longValue).sum();
        System.out.println("net: " + net + ", sum " + sum);
    }
}

record Expense(String paidBy, Map<String, Long> shares) {}
