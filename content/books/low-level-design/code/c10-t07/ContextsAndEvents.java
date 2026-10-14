import java.util.*;
import java.util.function.Consumer;

public class ContextsAndEvents {
    public static void main(String[] args) {
        var bus = new EventBus();
        var stock = new Warehouse.Stock(new Warehouse.Product("MUG-1", 3, 400));
        var ledger = new Billing.Ledger();
        bus.subscribe(stock::on);
        bus.subscribe(ledger::on);
        var mug = new Sales.Product("MUG-1", "Blue mug", 999);
        for (String id : List.of("O-1", "O-2")) {
            var order = Sales.Order.place(id, mug, 2);
            // a real app saves the order first, then publishes
            order.pullEvents().forEach(bus::publish);
        }
    }
}
// Published language: an immutable past-tense fact carrying ids and values.
record OrderPlaced(String orderId, String sku, int qty, long totalCents) {}
final class EventBus {
    private final List<Consumer<OrderPlaced>> handlers = new ArrayList<>();
    void subscribe(Consumer<OrderPlaced> h) { handlers.add(h); }
    void publish(OrderPlaced e) { handlers.forEach(h -> h.accept(e)); }
}
// Sales context: a Product is something we sell at a list price.
final class Sales {
    record Product(String sku, String name, long price) {}
    static final class Order {
        private final List<OrderPlaced> events = new ArrayList<>();
        static Order place(String id, Product p, int qty) {
            if (qty <= 0) throw new IllegalArgumentException("qty must be > 0");
            var o = new Order();   // invariants checked, state set...
            o.events.add(new OrderPlaced(id, p.sku(), qty, qty * p.price()));
            return o;
        }
        List<OrderPlaced> pullEvents() {
            var out = List.copyOf(events);
            events.clear();
            return out;
        }
    }
}
// Warehouse context: same word, own model: units on a shelf at a cost.
final class Warehouse {
    record Product(String sku, int onHand, long unitCostCents) {}
    static final class Stock {
        private Product item;
        Stock(Product item) { this.item = Objects.requireNonNull(item); }
        void on(OrderPlaced e) {
            if (!e.sku().equals(item.sku())) return;   // not our product
            int left = item.onHand() - e.qty();
            if (left < 0) {
                System.out.println("warehouse: backorder " + e.orderId());
                return;
            }
            item = new Product(item.sku(), left, item.unitCostCents());
            System.out.println("warehouse: reserved " + e.orderId()
                    + ", " + left + " left");
        }
    }
}
// Billing context: an order is only an amount owed.
final class Billing {
    static final class Ledger {
        private long owedCents;
        void on(OrderPlaced e) {
            owedCents += e.totalCents();
            System.out.println("billing: owed " + owedCents);
        }
    }
}
