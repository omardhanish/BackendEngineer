import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class CheckoutDemo {
    public static void main(String[] args) {
        Ledger ledger = new Ledger();
        var receipts = new ReceiptFormatter(new VatCalculator(20));
        var checkout = new CheckoutService(receipts, ledger);
        System.out.println(checkout.complete(new Order(List.of(8000L, 2000L))));
        System.out.println("Ledger: " + ledger.entries());
    }
    static String money(long cents) {
        return String.format("%d.%02d", cents / 100, cents % 100);
    }
}

// Plain data plus the one fact every team agrees on: the net total.
record Order(List<Long> pricesInCents) {
    Order {
        pricesInCents = List.copyOf(pricesInCents);
        if (pricesInCents.stream().anyMatch(p -> p < 0))
            throw new IllegalArgumentException("negative price");
    }
    long netCents() {
        return pricesInCents.stream().mapToLong(Long::longValue).sum();
    }
}

// Changes only when finance changes the tax rules.
record VatCalculator(int percent) {
    VatCalculator {
        if (percent < 0) throw new IllegalArgumentException("rate < 0");
    }
    long grossCents(long net) { return net + net * percent / 100; }
}

// Changes only when the receipt team changes what customers see.
record ReceiptFormatter(VatCalculator vat) {
    ReceiptFormatter { Objects.requireNonNull(vat, "vat"); }
    String format(Order o) {
        long gross = vat.grossCents(o.netCents());
        return o.pricesInCents().size() + " items, total "
                + CheckoutDemo.money(gross) + " incl. VAT";
    }
}

// Changes only when accounting changes how revenue is booked.
final class Ledger {
    private final List<String> entries = new ArrayList<>();
    void recordRevenue(long net) {
        entries.add("revenue " + CheckoutDemo.money(net));
    }
    List<String> entries() { return List.copyOf(entries); }
}

// Coordinates the steps; holds no business rule of its own.
final class CheckoutService {
    private final ReceiptFormatter receipts;
    private final Ledger ledger;
    CheckoutService(ReceiptFormatter receipts, Ledger ledger) {
        this.receipts = Objects.requireNonNull(receipts, "receipts");
        this.ledger = Objects.requireNonNull(ledger, "ledger");
    }
    String complete(Order order) {
        ledger.recordRevenue(order.netCents());
        return receipts.format(order);
    }
}
