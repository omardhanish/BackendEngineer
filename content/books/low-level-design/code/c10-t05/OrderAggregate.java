import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class OrderAggregate {
    public static void main(String[] args) {
        var po = new PurchaseOrder("SUP-9", 100_000);
        po.addLine("Laptop", 1, 90_000);
        attempt("add dock", () -> po.addLine("Dock", 1, 30_000));
        attempt("2 laptops", () -> po.changeQuantity(0, 2));
        po.submit();
        attempt("add cable", () -> po.addLine("Cable", 1, 1_000));
        System.out.println("total " + po.totalCents()
                + ", lines " + po.lines().size());
    }
    static void attempt(String what, Runnable action) {
        try { action.run(); } catch (IllegalStateException e) {
            System.out.println(what + " -> rejected: " + e.getMessage());
        }
    }
}
// Inside the boundary: immutable, reachable only through the root.
record OrderLine(String item, int quantity, long unitCents) {
    OrderLine {
        if (item == null || quantity <= 0 || unitCents < 0)
            throw new IllegalArgumentException("bad line");
    }
    long cents() { return quantity * unitCents; }
    OrderLine withQuantity(int q) { return new OrderLine(item, q, unitCents); }
}
// Aggregate root: every change goes through it, so it can say no.
final class PurchaseOrder {
    private final String supplierId;   // other aggregate: by id only
    private final long limit;
    private final List<OrderLine> lines = new ArrayList<>();
    private boolean submitted;
    PurchaseOrder(String supplierId, long limit) {
        this.supplierId = Objects.requireNonNull(supplierId, "supplier");
        if (limit < 0) throw new IllegalArgumentException("limit < 0");
        this.limit = limit;
    }
    void addLine(String item, int qty, long unitCents) {
        var next = new ArrayList<>(lines);
        next.add(new OrderLine(item, qty, unitCents));
        commit(next);
    }
    void changeQuantity(int i, int qty) {
        var next = new ArrayList<>(lines);
        next.set(i, lines.get(i).withQuantity(qty));
        commit(next);
    }
    // One gate checks every invariant before any state changes.
    private void commit(List<OrderLine> next) {
        if (submitted) throw new IllegalStateException("already submitted");
        if (sum(next) > limit) throw new IllegalStateException("over budget");
        lines.clear();
        lines.addAll(next);
    }
    void submit() { submitted = true; }
    List<OrderLine> lines() { return List.copyOf(lines); }
    long totalCents() { return sum(lines); }
    private static long sum(List<OrderLine> ls) {
        return ls.stream().mapToLong(OrderLine::cents).sum();
    }
}
