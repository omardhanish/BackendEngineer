import java.util.*;

public class ResilientRates {
    public static void main(String[] args) {
        var source = new ScriptedSource(
                List.of("timeout", "1.17", "timeout", "timeout", "timeout"));
        var rates = new RateService(source, 3);
        System.out.println("GBP " + rates.rate("GBP"));
        System.out.println("GBP " + rates.rate("GBP"));
        try {
            rates.rate("XYZ");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}
// Worth retrying: the next attempt may succeed.
class TransientException extends RuntimeException {
    TransientException(String message) { super(message); }
}
interface RateSource {
    double fetch(String currency);   // may throw TransientException
}
// Deterministic stand-in for a remote API: replies in a fixed order.
final class ScriptedSource implements RateSource {
    private final Deque<String> replies;
    ScriptedSource(List<String> replies) {
        this.replies = new ArrayDeque<>(replies);
    }
    public double fetch(String currency) {
        if (!currency.equals("GBP"))
            throw new IllegalArgumentException("unknown currency " + currency);
        String reply = replies.removeFirst();
        if (reply.equals("timeout")) throw new TransientException("timeout");
        return Double.parseDouble(reply);
    }
}
final class RateService {
    private final RateSource source;
    private final int maxAttempts;
    // Fallback per currency: a GBP rate must never answer for EUR.
    private final Map<String, Double> lastGood = new HashMap<>();
    RateService(RateSource source, int maxAttempts) {
        if (maxAttempts < 1) throw new IllegalArgumentException("attempts");
        this.source = Objects.requireNonNull(source, "source");
        this.maxAttempts = maxAttempts;
    }
    double rate(String currency) {
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                double r = source.fetch(currency);
                lastGood.put(currency, r);
                return r;
            } catch (TransientException e) {   // permanent errors pass
                System.out.println("  try " + attempt + ": " + e.getMessage());
                if (attempt < maxAttempts)   // real code sleeps here, + jitter
                    System.out.printf("  wait %dms%n", (100 << (attempt - 1)));
            }
        }
        Double stale = lastGood.get(currency);
        if (stale == null)
            throw new IllegalStateException("no rate yet for " + currency);
        System.out.println("  all tries failed, using last good rate");
        return stale;
    }
}
