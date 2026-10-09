import java.util.ArrayList;
import java.util.List;

public class OrderFlowDemo {
    public static void main(String[] args) {
        FoodOrder order = new FoodOrder("A-42");
        order.subscribe((id, s) -> System.out.println("app: " + id + " " + s));
        order.subscribe((id, s) -> {
            if (s == Status.READY) System.out.println("rider: collect " + id);
        });
        Actor[] moves = { Actor.RESTAURANT, Actor.PARTNER, Actor.RESTAURANT,
                Actor.PARTNER, Actor.PARTNER, Actor.CUSTOMER };
        for (Actor who : moves) {
            try {
                order.advance(who);
            } catch (IllegalStateException e) {
                System.out.println("refused: " + e.getMessage());
            }
        }
    }
}

enum Actor { CUSTOMER, RESTAURANT, PARTNER }

// each status names the one actor allowed to move the order into it
enum Status {
    PLACED(Actor.CUSTOMER), ACCEPTED(Actor.RESTAURANT), READY(Actor.RESTAURANT),
    PICKED_UP(Actor.PARTNER), DELIVERED(Actor.PARTNER);
    final Actor movedBy;
    Status(Actor movedBy) { this.movedBy = movedBy; }
}

interface OrderListener { void onStatus(String orderId, Status status); }

final class FoodOrder {
    private final String id;
    private final List<OrderListener> listeners = new ArrayList<>();
    private Status status = Status.PLACED;
    FoodOrder(String id) { this.id = id; }
    synchronized void subscribe(OrderListener l) { listeners.add(l); }
    synchronized void advance(Actor who) {
        if (status == Status.DELIVERED)
            throw new IllegalStateException(id + " is already delivered");
        Status next = Status.values()[status.ordinal() + 1];
        if (next.movedBy != who)
            throw new IllegalStateException(who + " cannot set " + next);
        status = next;
        listeners.forEach(l -> l.onStatus(id, next));
    }
}
