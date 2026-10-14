import java.util.ArrayList;
import java.util.List;

public class SplitSwitch {
    public static void main(String[] args) {
        List<String> users = List.of("Asha", "Ben", "Chen");
        print("EQUAL", ExpenseService.split(SplitType.EQUAL, 1000, users,
                List.of()));
        print("PERCENT", ExpenseService.split(SplitType.PERCENT, 1000, users,
                List.of(3333L, 3333L, 3334L)));    // basis points
        print("EXACT", ExpenseService.split(SplitType.EXACT, 1000, users,
                List.of(500L, 300L, 100L)));        // sums to 900
    }

    static void print(String label, List<Long> shares) {
        long sum = shares.stream().mapToLong(Long::longValue).sum();
        System.out.println(label + " " + shares + " sum " + sum + " of 1000");
    }
}

enum SplitType { EQUAL, PERCENT, EXACT }

class ExpenseService {
    // Every new split type means editing this method: OCP is broken.
    static List<Long> split(SplitType type, long total, List<String> users,
                            List<Long> inputs) {
        List<Long> out = new ArrayList<>();
        switch (type) {
            case EQUAL -> users.forEach(u -> out.add(total / users.size()));
            case PERCENT -> inputs.forEach(bp -> out.add(total * bp / 10_000));
            case EXACT -> out.addAll(inputs);       // trusted blindly
        }
        return out;
    }
}
