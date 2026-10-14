import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class SplitStrategies {
    public static void main(String[] args) {
        List<String> trio = List.of("Asha", "Ben", "Chen");
        List<SplitStrategy> all = List.of(
                WeightedSplit.equal(trio),
                WeightedSplit.percent(trio, 3333, 3333, 3334), // basis pts
                new ExactSplit(List.of(new Share("Asha", 500),
                        new Share("Ben", 300), new Share("Chen", 100))));
        for (SplitStrategy s : all) {
            try { System.out.println(s.split(1000)); }
            catch (IllegalArgumentException e) {
                System.out.println("rejected: " + e.getMessage());
            }
        }
    }
}

record Share(String user, long cents) {}
interface SplitStrategy {
    /** Returns shares that always sum to totalCents, or throws. */
    List<Share> split(long totalCents);
}
/** Equal and percent are both "split by weight". */
final class WeightedSplit implements SplitStrategy {
    private final List<String> users;
    private final long[] weights;
    private WeightedSplit(List<String> users, long[] weights) {
        if (users.isEmpty() || users.size() != weights.length)
            throw new IllegalArgumentException("one weight per user");
        if (Arrays.stream(weights).anyMatch(w -> w < 0))
            throw new IllegalArgumentException("negative weight");
        this.users = List.copyOf(users);
        this.weights = weights.clone();
    }
    static WeightedSplit equal(List<String> users) {
        long[] ones = new long[users.size()];
        Arrays.fill(ones, 1);
        return new WeightedSplit(users, ones);
    }
    static WeightedSplit percent(List<String> users, long... basisPoints) {
        if (Arrays.stream(basisPoints).sum() != 10_000)
            throw new IllegalArgumentException("percents must total 100");
        return new WeightedSplit(users, basisPoints);
    }
    public List<Share> split(long total) {
        if (total <= 0) throw new IllegalArgumentException("total <= 0");
        long sum = Arrays.stream(weights).sum(), given = 0;
        List<Share> out = new ArrayList<>();
        for (int i = 0; i < weights.length; i++) {
            long c = total * weights[i] / sum;               // rounds down
            out.add(new Share(users.get(i), c));
            given += c;
        }
        for (int i = 0; given < total; i++, given++)    // fewer than n left
            out.set(i, new Share(users.get(i), out.get(i).cents() + 1));
        return List.copyOf(out);
    }
}

class ExactSplit implements SplitStrategy {
    private final List<Share> shares;
    ExactSplit(List<Share> shares) { this.shares = List.copyOf(shares); }
    public List<Share> split(long total) {
        long sum = shares.stream().mapToLong(Share::cents).sum();
        if (sum != total) throw new IllegalArgumentException(
                "amounts sum to " + sum + ", not " + total);
        return shares;
    }
}
