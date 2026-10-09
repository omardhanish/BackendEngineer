import java.util.*;
public class AggregateDemo {
    public static void main(String[] args) {
        OrderRepository repo = new OrderRepository();
        Order order = new Order("O-1", 3);      // invariant: at most 3 units
        order.addLine("pen", 2);
        repo.save(order);
        Order loaded = repo.find("O-1").orElseThrow();
        for (String sku : List.of("pad", "ink")) {
            try {
                loaded.addLine(sku, 1);
                System.out.println("added " + sku);
            } catch (IllegalStateException e) {
                System.out.println("refused " + sku + ": " + e.getMessage());
            }
        }
        loaded.place();                         // records a domain event
        System.out.println(loaded.events());
    }
}
record Line(String sku, int qty) {}
record OrderPlaced(String orderId, int units) {}
class Order {                                   // aggregate root
    private final String id;
    private final int maxUnits;
    private final List<Line> lines = new ArrayList<>();
    private final List<OrderPlaced> events = new ArrayList<>();
    private boolean placed;
    Order(String id, int maxUnits) { this.id = id; this.maxUnits = maxUnits; }
    void addLine(String sku, int qty) {         // the only way in
        if (placed) throw new IllegalStateException("placed");
        if (units() + qty > maxUnits) throw new IllegalStateException("full");
        lines.add(new Line(sku, qty));
    }
    void place() { placed = true; events.add(new OrderPlaced(id, units())); }
    int units() { return lines.stream().mapToInt(Line::qty).sum(); }
    String id() { return id; }
    List<OrderPlaced> events() { return List.copyOf(events); }
}

class OrderRepository {                         // stores whole aggregates
    private final Map<String, Order> store = new LinkedHashMap<>();
    void save(Order o) { store.put(o.id(), o); }
    Optional<Order> find(String k) { return Optional.ofNullable(store.get(k)); }
}
