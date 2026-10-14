import java.util.List;
import java.util.Objects;
import java.util.Optional;
public class RefundChainDemo {
    public static void main(String[] args) {
        RefundHandler chain = RefundHandler.link(
            new FraudCheck(),
            new LimitApprover("auto", 50),
            new LimitApprover("agent", 500),
            new LimitApprover("finance", 5_000));
        List<Refund> refunds = List.of(
            new Refund("R-1", 30, false), new Refund("R-2", 40, true),
            new Refund("R-3", 320, false), new Refund("R-4", 9_000, false));
        for (Refund r : refunds) {
            System.out.println(r.id() + " -> " + chain.handle(r));
        }
    }
}
record Refund(String id, long amount, boolean flagged) {
    Refund {
        Objects.requireNonNull(id, "id");
        if (amount <= 0) throw new IllegalArgumentException("amount <= 0");
    }
}
abstract class RefundHandler {
    private RefundHandler next;
    static RefundHandler link(RefundHandler first, RefundHandler... rest) {
        RefundHandler current = Objects.requireNonNull(first, "first");
        for (RefundHandler h : rest) {
            current.next = Objects.requireNonNull(h, "handler");
            current = h;
        }
        return first;
    }
    final String handle(Refund r) {             // the fixed walking rule
        Optional<String> result = tryHandle(r);
        if (result.isPresent()) return result.get();
        if (next == null) return "REJECTED: nobody can approve";
        return next.handle(r);
    }
    protected abstract Optional<String> tryHandle(Refund r);
}
final class FraudCheck extends RefundHandler {
    @Override protected Optional<String> tryHandle(Refund r) {
        return r.flagged() ? Optional.of("HELD for fraud review")
                           : Optional.empty();
    }
}
final class LimitApprover extends RefundHandler {
    private final String role;
    private final long limit;
    LimitApprover(String role, long limit) {
        this.role = Objects.requireNonNull(role, "role");
        if (limit <= 0) throw new IllegalArgumentException("limit");
        this.limit = limit;
    }
    @Override protected Optional<String> tryHandle(Refund r) {
        return r.amount() <= limit ? Optional.of("APPROVED by " + role)
                                   : Optional.empty();
    }
}
