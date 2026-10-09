import java.util.*;

public class CheckoutDemo {
    public static void main(String[] args) {
        Inventory stock = new Inventory(Map.of("PEN", 5, "BOOK", 1));
        Cart ana = new Cart().add("PEN", 2, 150).add("BOOK", 1, 1200);
        Cart ben = new Cart().add("PEN", 1, 150).add("BOOK", 1, 1200);
        System.out.println(stock.checkout("O-1", ana));
        try {
            stock.checkout("O-2", ben);
        } catch (IllegalStateException e) {
            System.out.println("O-2 failed: " + e.getMessage());
        }
        System.out.println("stock: " + stock.snapshot());
        System.out.println("ana: " + ana.lines() + ", ben: " + ben.lines());
    }
}

record Line(String sku, int qty, long price) {} // price copied at checkout
record Order(String id, List<Line> lines) {}

final class Cart {
    private final Map<String, Line> items = new LinkedHashMap<>();
    Cart add(String sku, int n, long price) {
        items.merge(sku, new Line(sku, n, price),
                (a, b) -> new Line(sku, a.qty() + n, a.price()));
        return this;
    }
    List<Line> lines() { return List.copyOf(items.values()); }
    void clear() { items.clear(); }
}

final class Inventory {
    private final Map<String, Integer> stock;
    Inventory(Map<String, Integer> start) { stock = new TreeMap<>(start); }
    // all-or-nothing: check every line, then take every line
    synchronized Order checkout(String id, Cart cart) {
        List<Line> lines = cart.lines();
        for (Line l : lines)
            if (stock.getOrDefault(l.sku(), 0) < l.qty())
                throw new IllegalStateException("not enough " + l.sku());
        for (Line l : lines) stock.merge(l.sku(), -l.qty(), Integer::sum);
        cart.clear();
        return new Order(id, lines);
    }
    synchronized Map<String, Integer> snapshot() {
        return new TreeMap<>(stock);
    }
}
