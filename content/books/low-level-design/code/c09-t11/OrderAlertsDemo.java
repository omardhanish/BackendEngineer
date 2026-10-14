import java.util.*;

public class OrderAlertsDemo {
    public static void main(String[] args) {
        Channel push = (who, t) -> System.out.println("push " + who + ": " + t);
        Channel sms = (who, t) -> System.out.println("sms  " + who + ": " + t);
        Order order = new Order("F-101");
        order.subscribe(e -> {
            if (e.to() == Status.DELIVERED)
                throw new IllegalStateException("analytics down");
        });
        order.subscribe(new CustomerAlerts(push));
        order.subscribe(new RiderAlerts(sms));
        for (Status s : List.of(Status.ACCEPTED, Status.ACCEPTED,
                Status.READY, Status.PICKED_UP, Status.DELIVERED))
            order.moveTo(s);
    }
}

enum Status { PLACED, ACCEPTED, READY, PICKED_UP, DELIVERED }
record OrderEvent(String orderId, Status from, Status to) {}
interface OrderListener { void onChange(OrderEvent e); }
interface Channel { void send(String who, String text); }

class Order {
    private final String id;
    private final List<OrderListener> listeners = new ArrayList<>();
    private Status status = Status.PLACED;
    Order(String id) { this.id = Objects.requireNonNull(id, "id"); }

    void subscribe(OrderListener l) {
        listeners.add(Objects.requireNonNull(l, "listener"));
    }

    void moveTo(Status next) {
        if (next == status) return;            // same state: no alert
        OrderEvent event = new OrderEvent(id, status, next);
        status = next;
        for (OrderListener l : listeners) {
            try { l.onChange(event); }
            catch (RuntimeException ex) {      // isolate a bad listener
                System.out.println("listener failed: " + ex.getMessage());
            }
        }
    }
}

record CustomerAlerts(Channel channel) implements OrderListener {
    CustomerAlerts { Objects.requireNonNull(channel, "channel"); }
    public void onChange(OrderEvent e) {
        String text = switch (e.to()) {
            case ACCEPTED -> "the kitchen is cooking";
            case PICKED_UP -> "your rider is on the way";
            case DELIVERED -> "delivered, enjoy";
            default -> null;                   // nothing worth a ping
        };
        if (text != null) channel.send("customer", e.orderId() + " " + text);
    }
}

record RiderAlerts(Channel channel) implements OrderListener {
    RiderAlerts { Objects.requireNonNull(channel, "channel"); }
    public void onChange(OrderEvent e) {
        if (e.to() == Status.READY)
            channel.send("rider", e.orderId() + " is ready for pickup");
    }
}
