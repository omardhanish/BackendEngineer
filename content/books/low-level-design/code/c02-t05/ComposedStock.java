import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class ComposedStock {
    public static void main(String[] args) {
        var trail = new MemoryAudit();
        var stock = new Stock(trail);
        stock.add("SKU-1");
        stock.addAll(List.of("SKU-2", "SKU-3"));
        stock.remove("SKU-2");
        System.out.println("Items: " + stock.items());
        System.out.println("Audit: " + trail.lines());
        try {
            stock.items().add("SKU-X");
        } catch (UnsupportedOperationException e) {
            System.out.println("Backdoor closed: items() is read-only");
        }
    }
}

// The role Stock needs; any audit store can play it.
interface AuditSink {
    void record(String event);
}

final class MemoryAudit implements AuditSink {
    private final List<String> lines = new ArrayList<>();
    public void record(String event) { lines.add(event); }
    List<String> lines() { return List.copyOf(lines); }
}

// Has-a list and has-a sink; callers see only these four methods.
final class Stock {
    private final List<String> skus = new ArrayList<>();
    private final AuditSink audit;

    Stock(AuditSink audit) {
        this.audit = Objects.requireNonNull(audit, "audit");
    }
    void add(String sku) {
        Objects.requireNonNull(sku, "sku");
        skus.add(sku);
        audit.record("added " + sku);
    }
    void addAll(List<String> batch) {
        batch.forEach(this::add); // every path goes through add()
    }
    boolean remove(String sku) {
        boolean removed = skus.remove(sku);
        if (removed) audit.record("removed " + sku);
        return removed;
    }
    List<String> items() {
        return List.copyOf(skus);
    }
}
