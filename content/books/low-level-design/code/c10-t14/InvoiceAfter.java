import java.util.List;
import java.util.Objects;

public class InvoiceAfter {
    public static void main(String[] args) {
        InvoicePrinter p = new InvoicePrinter();
        // The same three tests, rewritten for the new signature.
        check("plain invoice", p.print(new Invoice("Ada",
            List.of(new Line("Pen", 2, 150), new Line("Pad", 1, 420)),
            false))
            .equals("Invoice: Ada\nPen x2 = 300\nPad x1 = 420\nTotal: 720"));
        check("vip over 1000 gets 10% off", p.print(new Invoice("Bo",
            List.of(new Line("Lamp", 1, 1200)), true))
            .equals("Invoice: Bo\nLamp x1 = 1200\nTotal: 1080"));
        check("vip at exactly 1000 pays full", p.print(new Invoice("Cy",
            List.of(new Line("Desk", 1, 1000)), true))
            .equals("Invoice: Cy\nDesk x1 = 1000\nTotal: 1000"));
    }

    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}

// Introduce Parameter Object: three parallel arrays became one list.
record Line(String item, int quantity, int unitCents) {
    int totalCents() {
        return quantity * unitCents;
    }
}

record Invoice(String customer, List<Line> lines, boolean vip) {
    Invoice {
        Objects.requireNonNull(customer, "customer");
        lines = List.copyOf(lines);
    }
}

class InvoicePrinter {
    private static final int VIP_THRESHOLD_CENTS = 1000;

    String print(Invoice invoice) {
        StringBuilder out = new StringBuilder();
        out.append("Invoice: ").append(invoice.customer()).append('\n');
        for (Line line : invoice.lines()) {
            out.append(line.item()).append(" x").append(line.quantity())
               .append(" = ").append(line.totalCents()).append('\n');
        }
        return out.append("Total: ").append(total(invoice)).toString();
    }

    // Extract Method: the pricing rule now has a name and one home.
    private int total(Invoice invoice) {
        int subtotal = invoice.lines().stream()
            .mapToInt(Line::totalCents).sum();
        boolean discounted = invoice.vip()
            && subtotal > VIP_THRESHOLD_CENTS;
        return discounted ? subtotal - subtotal / 10 : subtotal;
    }
}
