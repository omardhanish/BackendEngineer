import java.util.ArrayList;
import java.util.List;

public class OrderGodClass {
    public static void main(String[] args) {
        Order order = new Order();
        order.add("Keyboard", 8000);
        order.add("Mouse", 2000);
        List<String> ledger = new ArrayList<>();
        System.out.println(order.receipt());
        order.recordInLedger(ledger);
        System.out.println("Ledger: " + ledger);
        System.out.println("Accounting expected net revenue 100.00");
    }
}

// One class, three teams: pricing, receipt layout, bookkeeping.
class Order {
    private final List<String> names = new ArrayList<>();
    private final List<Long> pricesInCents = new ArrayList<>();

    void add(String name, long cents) {
        if (cents < 0) throw new IllegalArgumentException("negative price");
        names.add(name);
        pricesInCents.add(cents);
    }

    // Edited for the receipt team: "show prices including 20% VAT".
    long totalCents() {
        long net = pricesInCents.stream().mapToLong(Long::longValue).sum();
        return net + net * 20 / 100;
    }

    String receipt() {
        return names.size() + " items, total " + money(totalCents());
    }

    // Bookkeeping reuses totalCents(), so it now books VAT as revenue.
    void recordInLedger(List<String> ledger) {
        ledger.add("revenue " + money(totalCents()));
    }

    private static String money(long cents) {
        return String.format("%d.%02d", cents / 100, cents % 100);
    }
}
