import java.util.*;

public class OrderLifecycleDemo {
    public static void main(String[] args) {
        FoodOrder order = new FoodOrder("O-7");
        order.apply(Actor.RESTAURANT, OrderStatus.ACCEPTED);
        tryApply(order, Actor.CUSTOMER, OrderStatus.CANCELLED);
        order.apply(Actor.RESTAURANT, OrderStatus.PREPARING);
        order.apply(Actor.RESTAURANT, OrderStatus.READY);
        tryApply(order, Actor.RESTAURANT, OrderStatus.PICKED_UP);
        order.apply(Actor.RIDER, OrderStatus.PICKED_UP);
        order.apply(Actor.RIDER, OrderStatus.DELIVERED);
        System.out.println(order.log());
    }

    static void tryApply(FoodOrder o, Actor who, OrderStatus to) {
        try { o.apply(who, to); }
        catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}

enum Actor { CUSTOMER, RESTAURANT, RIDER }
enum OrderStatus {
    PLACED, ACCEPTED, REJECTED, PREPARING, READY, PICKED_UP, DELIVERED,
    CANCELLED
}
record Transition(OrderStatus from, OrderStatus to, Actor by) {}

final class FoodOrder {
    // The whole lifecycle as data: from, to, and who may trigger it.
    private static final Set<Transition> ALLOWED = parse("""
        PLACED     ACCEPTED   RESTAURANT
        PLACED     REJECTED   RESTAURANT
        PLACED     CANCELLED  CUSTOMER
        ACCEPTED   PREPARING  RESTAURANT
        ACCEPTED   CANCELLED  RESTAURANT
        PREPARING  READY      RESTAURANT
        READY      PICKED_UP  RIDER
        PICKED_UP  DELIVERED  RIDER
        """);

    private final String id;
    private final List<String> log = new ArrayList<>();
    private OrderStatus status = OrderStatus.PLACED;

    FoodOrder(String id) { this.id = Objects.requireNonNull(id, "id"); }

    synchronized void apply(Actor by, OrderStatus to) {
        if (!ALLOWED.contains(new Transition(status, to, by))) {
            throw new IllegalStateException(
                id + ": " + by + " may not move " + status + " -> " + to);
        }
        log.add(by + ":" + to);
        status = to;
    }
    synchronized String log() { return id + " " + log; }

    private static Set<Transition> parse(String table) {
        Set<Transition> set = new HashSet<>();
        for (String row : table.strip().split("\n")) {
            String[] c = row.strip().split("\\s+");
            set.add(new Transition(OrderStatus.valueOf(c[0]),
                OrderStatus.valueOf(c[1]), Actor.valueOf(c[2])));
        }
        return Set.copyOf(set);
    }
}
