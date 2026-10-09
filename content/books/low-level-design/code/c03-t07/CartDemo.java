import java.util.*;

public class CartDemo {
    public static void main(String[] args) {
        Cart cart = new Cart();
        cart.add(new Product("PEN", 150), 3);
        cart.add(new Product("BOOK", 1200), 1);
        cart.add(new Product("PEN", 150), 1); // merges into the PEN line
        long total = cart.subtotal();
        System.out.println("subtotal: " + total);
        List<PriceRule> rules = List.of(new BuyNGetOne("PEN", 3),
                new PercentOff(10));
        for (PriceRule rule : rules) {
            long off = rule.discount(cart, total);
            total -= off;
            System.out.println(rule + " -" + off + " = " + total);
        }
    }
}

record Product(String sku, long price) {} // price in cents

final class Cart {
    private final Map<String, Product> products = new LinkedHashMap<>();
    private final Map<String, Integer> qty = new LinkedHashMap<>();
    void add(Product p, int n) {
        if (n <= 0) throw new IllegalArgumentException("quantity must be > 0");
        products.putIfAbsent(p.sku(), p);
        qty.merge(p.sku(), n, Integer::sum);
    }
    int quantity(String sku) { return qty.getOrDefault(sku, 0); }
    long price(String sku) { return products.get(sku).price(); }
    long subtotal() {
        return qty.entrySet().stream()
                .mapToLong(e -> price(e.getKey()) * e.getValue()).sum();
    }
}

interface PriceRule { long discount(Cart cart, long runningTotal); }

record BuyNGetOne(String sku, int n) implements PriceRule {
    public long discount(Cart c, long t) {
        if (c.quantity(sku) == 0) return 0;
        return c.quantity(sku) / (n + 1) * c.price(sku);
    }
}

record PercentOff(int percent) implements PriceRule {
    public long discount(Cart c, long t) { return t * percent / 100; }
}
