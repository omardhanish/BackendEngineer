import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class InventoryDemo {
    public static void main(String[] args) {
        var sku = new Sku("SKU-1");
        var inv = new Inventory(Map.of(sku, 5));
        // inv.reserve(sku, new OrderId("ORD-7"), ...) does not compile.
        System.out.println(inv.reserve(new OrderId("ORD-7"), sku, 3,
                Shortfall.REJECT));
        System.out.println(inv.reserve(new OrderId("ORD-8"), sku, 4,
                Shortfall.REJECT));
        System.out.println(inv.reserve(new OrderId("ORD-9"), sku, 4,
                Shortfall.BACKORDER));
        System.out.println("stock now " + inv.stockOf(sku));
        System.out.println("ORD-404 found: "
                + inv.find(new OrderId("ORD-404")).isPresent());
        try {
            inv.reserve(new OrderId("ORD-10"), sku, -2, Shortfall.REJECT);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

record OrderId(String value) {
    OrderId { Objects.requireNonNull(value, "order id"); }
    public String toString() { return value; }
}

record Sku(String value) {
    Sku { Objects.requireNonNull(value, "sku"); }
    public String toString() { return value; }
}

enum Shortfall { REJECT, BACKORDER }

record Reservation(OrderId order, Sku sku, int qty, boolean backordered) { }

final class Inventory {
    private final Map<Sku, Integer> stock;
    private final List<Reservation> reservations = new ArrayList<>();

    Inventory(Map<Sku, Integer> initial) { stock = new HashMap<>(initial); }

    Optional<Reservation> reserve(OrderId order, Sku sku, int qty,
                                  Shortfall onShortfall) {
        Objects.requireNonNull(order, "order");
        Objects.requireNonNull(onShortfall, "onShortfall");
        if (qty <= 0) throw new IllegalArgumentException("qty must be > 0");
        Integer have = stock.get(sku);
        if (have == null) throw new IllegalArgumentException("unknown " + sku);
        boolean isShort = have < qty;
        if (isShort && onShortfall == Shortfall.REJECT) return Optional.empty();
        stock.put(sku, have - qty);
        var r = new Reservation(order, sku, qty, isShort);
        reservations.add(r);
        return Optional.of(r);
    }
    Optional<Reservation> find(OrderId order) {
        return reservations.stream()
                .filter(r -> r.order().equals(order)).findFirst();
    }
    List<Reservation> reservations() { return List.copyOf(reservations); }
    int stockOf(Sku sku) { return stock.getOrDefault(sku, 0); }
}
