import java.util.*;

public class OrderingDemo {
    public static void main(String[] args) {
        Restaurant pizza = new Restaurant("Pizza Place");
        pizza.put(new MenuItem("M1", "Margherita", 900));
        pizza.put(new MenuItem("M2", "Garlic bread", 350));
        Cart cart = new Cart("C9", pizza);
        cart.add("M1", 2);
        cart.add("M2", 1);
        try {
            cart.add("S1", 1);                    // a Sushi Bar item id
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
        Order order = new OrderService().place(cart);
        pizza.put(new MenuItem("M1", "Margherita", 1200)); // later price rise
        System.out.println(order);
    }
}

record MenuItem(String id, String name, long priceCents) {
    MenuItem {
        Objects.requireNonNull(id, "id");
        if (priceCents <= 0) throw new IllegalArgumentException("price <= 0");
    }
}
final class Restaurant {
    private final String name;
    private final Map<String, MenuItem> menu = new HashMap<>();
    Restaurant(String name) { this.name = Objects.requireNonNull(name); }
    String name() { return name; }
    void put(MenuItem item) { menu.put(item.id(), item); }
    Optional<MenuItem> find(String id) {
        return Optional.ofNullable(menu.get(id));
    }
}
final class Cart {
    private final String customerId;
    private final Restaurant restaurant;      // one cart, one restaurant
    private final Map<String, Integer> qty = new LinkedHashMap<>();
    Cart(String customerId, Restaurant restaurant) {
        this.customerId = Objects.requireNonNull(customerId);
        this.restaurant = Objects.requireNonNull(restaurant);
    }
    void add(String itemId, int n) {
        if (n < 1) throw new IllegalArgumentException("quantity must be >= 1");
        if (restaurant.find(itemId).isEmpty()) {
            throw new IllegalArgumentException(
                itemId + " is not on the " + restaurant.name() + " menu");
        }
        qty.merge(itemId, n, Integer::sum);
    }
    String customerId() { return customerId; }
    Restaurant restaurant() { return restaurant; }
    Map<String, Integer> lines() { return Collections.unmodifiableMap(qty); }
}
record OrderLine(String name, long unitCents, int qty) {}
record Order(String customerId, String restaurant, List<OrderLine> lines) {
    Order { lines = List.copyOf(lines); }     // frozen snapshot
    long totalCents() {
        return lines.stream().mapToLong(l -> l.unitCents() * l.qty()).sum();
    }
    @Override public String toString() {
        return customerId + " @ " + restaurant + ", " + lines.size()
            + " lines, total " + totalCents();
    }
}
final class OrderService {
    Order place(Cart cart) {
        if (cart.lines().isEmpty()) throw new IllegalStateException("empty");
        Restaurant r = cart.restaurant();
        List<OrderLine> lines = new ArrayList<>();
        cart.lines().forEach((id, n) -> {
            MenuItem m = r.find(id).orElseThrow(
                () -> new IllegalStateException(id + " was removed"));
            lines.add(new OrderLine(m.name(), m.priceCents(), n));
        });
        return new Order(cart.customerId(), r.name(), lines);
    }
}
