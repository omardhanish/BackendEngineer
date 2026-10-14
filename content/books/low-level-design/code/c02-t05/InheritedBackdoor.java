import java.util.ArrayList;
import java.util.List;

public class InheritedBackdoor {
    public static void main(String[] args) {
        var stock = new AuditedStock();
        stock.add("SKU-1");
        stock.addAll(List.of("SKU-2", "SKU-3"));
        stock.set(0, "SKU-9");
        stock.removeIf(sku -> sku.equals("SKU-2"));
        System.out.println("Items: " + stock);
        System.out.println("Audit: " + stock.audit());
    }
}

// Goal: every change to the stock is written to the audit trail.
// Approach: extend ArrayList and override add().
class AuditedStock extends ArrayList<String> {
    private final List<String> audit = new ArrayList<>();

    @Override
    public boolean add(String sku) {
        audit.add("added " + sku);
        return super.add(sku);
    }

    List<String> audit() {
        return List.copyOf(audit);
    }
}
