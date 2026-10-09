import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

public class SettleDemo {
    public static void main(String[] args) {
        Map<String, Long> net = Map.of("ana", 5000L, "ben", -2000L,
                "cy", -4000L, "dev", 1000L); // sums to zero
        Settler.settle(net).forEach(System.out::println);
    }
}

record Transfer(String from, String to, long cents) {
    @Override
    public String toString() { return from + " pays " + to + " " + cents; }
}

final class Settler {
    // greedy: the biggest debtor pays the biggest creditor, repeat
    static List<Transfer> settle(Map<String, Long> net) {
        Map<String, Long> left = new TreeMap<>(net);
        List<Transfer> out = new ArrayList<>();
        while (true) {
            Optional<String> to = biggest(left, 1), from = biggest(left, -1);
            if (to.isEmpty() || from.isEmpty()) return out;
            long cents = Math.min(left.get(to.get()), -left.get(from.get()));
            out.add(new Transfer(from.get(), to.get(), cents));
            left.merge(to.get(), -cents, Long::sum);
            left.merge(from.get(), cents, Long::sum);
        }
    }

    // sign 1 finds the largest credit, sign -1 the largest debt
    private static Optional<String> biggest(Map<String, Long> m, int sign) {
        return m.entrySet().stream().filter(e -> e.getValue() * sign > 0)
                .max(Map.Entry.comparingByValue((a, b) ->
                        Long.compare(a * sign, b * sign)))
                .map(Map.Entry::getKey);
    }
}
