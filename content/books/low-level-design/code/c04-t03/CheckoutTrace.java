import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
public class CheckoutTrace {
    public static void main(String[] args) {
        var stock = new Inventory("BOOK", 10);
        var service = new OrderService(stock, new Payment(5000));
        System.out.println("-- 2 x BOOK --");
        System.out.println("Controller <-- " + service.placeOrder("BOOK", 2));
        System.out.println("-- 4 x BOOK --");
        System.out.println("Controller <-- " + service.placeOrder("BOOK", 4));
        System.out.println("BOOK free " + stock.free("BOOK")
                + ", sold " + stock.sold("BOOK"));
    }
    static void call(String from, String to, String msg) {
        System.out.println("  " + from + " -> " + to + ": " + msg);
    }
}
enum Result { CONFIRMED, PAYMENT_DECLINED }
final class Inventory {
    private final Map<String, Integer> free = new HashMap<>();
    private final Map<String, Integer> sold = new HashMap<>();
    Inventory(String sku, int qty) { free.put(sku, qty); }
    void reserve(String sku, int qty) {
        if (qty <= 0) throw new IllegalArgumentException("qty must be > 0");
        if (qty > free(sku))
            throw new IllegalStateException("cannot reserve " + qty);
        free.put(sku, free(sku) - qty);
    }
    void commit(String sku, int qty) { sold.merge(sku, qty, Integer::sum); }
    void release(String sku, int qty) { free.merge(sku, qty, Integer::sum); }
    int free(String sku) { return free.getOrDefault(sku, 0); }
    int sold(String sku) { return sold.getOrDefault(sku, 0); }
}
record Payment(long limitCents) {         // fake gateway: declines big sums
    boolean charge(long cents) { return cents <= limitCents; }
}
final class OrderService {
    private static final long PRICE_CENTS = 1500;
    private final Inventory inventory;
    private final Payment payment;
    OrderService(Inventory inventory, Payment payment) {
        this.inventory = Objects.requireNonNull(inventory, "inventory");
        this.payment = Objects.requireNonNull(payment, "payment");
    }
    Result placeOrder(String sku, int qty) {
        CheckoutTrace.call("OrderService", "Inventory", "reserve " + qty);
        inventory.reserve(sku, qty);
        long cents = PRICE_CENTS * qty;
        CheckoutTrace.call("OrderService", "Payment", "charge " + cents);
        if (payment.charge(cents)) {                 // alt: approved
            CheckoutTrace.call("OrderService", "Inventory", "commit " + qty);
            inventory.commit(sku, qty);
            return Result.CONFIRMED;
        }
        CheckoutTrace.call("OrderService", "Inventory", "release " + qty);
        inventory.release(sku, qty);                 // else: declined
        return Result.PAYMENT_DECLINED;
    }
}
