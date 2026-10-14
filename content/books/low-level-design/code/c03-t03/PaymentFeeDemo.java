import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class PaymentFeeDemo {
    public static void main(String[] args) {
        var fees = new FeeCalculator(List.of(
                new PercentPlusFixed("card", 290, 30),
                new FlatFee("bank", 50),
                new CappedPercent("wallet", 100, 99)));  // the only new line
        for (String m : List.of("card", "bank", "wallet")) {
            long c = fees.feeCents(m, 10_000);
            System.out.printf("%s: %d.%02d%n", m, c / 100, c % 100);
        }
        try {
            fees.feeCents("crypto", 10_000);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}
// The extension point: one class per way of charging a fee.
interface PaymentMethod { String key(); long feeCents(long amountCents); }
record PercentPlusFixed(String key, long basisPoints, long fixedCents)
        implements PaymentMethod {
    PercentPlusFixed {
        Objects.requireNonNull(key, "key");
        if (basisPoints < 0 || fixedCents < 0)
            throw new IllegalArgumentException("negative fee");
    }
    public long feeCents(long amount) {
        return fixedCents + amount * basisPoints / 10_000;
    }
}
record FlatFee(String key, long cents) implements PaymentMethod {
    public long feeCents(long amount) { return cents; }
}
// New behaviour arrives as a new class, not a new branch.
record CappedPercent(String key, long basisPoints, long capCents)
        implements PaymentMethod {
    public long feeCents(long amount) {
        return Math.min(capCents, amount * basisPoints / 10_000);
    }
}
// Closed: this class never changes when a payment method is added.
final class FeeCalculator {
    private final Map<String, PaymentMethod> methods = new LinkedHashMap<>();
    FeeCalculator(List<PaymentMethod> methods) {
        for (PaymentMethod m : methods)
            if (this.methods.putIfAbsent(m.key(), m) != null)
                throw new IllegalArgumentException("duplicate " + m.key());
    }
    long feeCents(String key, long amountCents) {
        if (amountCents <= 0) throw new IllegalArgumentException("amount <= 0");
        PaymentMethod method = methods.get(key);
        if (method == null)
            throw new IllegalArgumentException("unknown " + key);
        return method.feeCents(amountCents);
    }
}
