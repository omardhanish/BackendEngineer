import java.util.ArrayList;
import java.util.List;

public class OpenOrder {
    public static void main(String[] args) {
        PurchaseOrder po = new PurchaseOrder(100_000);
        po.addLine("Laptop", 1, 90_000);
        System.out.println("total " + po.totalCents()
                + " / limit " + po.limitCents);

        // Two callers skip the root and edit its parts directly.
        po.lines().add(new OrderLine("Dock", 1, 30_000));
        po.lines().get(0).quantity = 2;
        System.out.println("total " + po.totalCents()
                + " / limit " + po.limitCents);
        System.out.println("within budget? "
                + (po.totalCents() <= po.limitCents));
    }
}

class OrderLine {
    final String item;
    int quantity;                  // public setter in all but name
    final long unitCents;
    OrderLine(String item, int quantity, long unitCents) {
        this.item = item;
        this.quantity = quantity;
        this.unitCents = unitCents;
    }
}

// The rule "total <= limit" is checked in one method only.
class PurchaseOrder {
    final long limitCents;
    private final List<OrderLine> lines = new ArrayList<>();
    PurchaseOrder(long limitCents) { this.limitCents = limitCents; }

    void addLine(String item, int qty, long unitCents) {
        if (totalCents() + qty * unitCents > limitCents)
            throw new IllegalStateException("over budget");
        lines.add(new OrderLine(item, qty, unitCents));
    }
    List<OrderLine> lines() { return lines; }
    long totalCents() {
        return lines.stream().mapToLong(l -> l.quantity * l.unitCents).sum();
    }
}
