import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class NotifyDemo {
    public static void main(String[] args) {
        Channel email = (u, t) -> System.out.println("email " + u + ": " + t);
        Channel sms = (u, t) -> System.out.println("sms " + u + ": " + t);
        Map<String, List<Channel>> prefs = Map.of(
            "ada", List.of(email, sms), "linus", List.of(email));
        OrderService orders = new OrderService();
        orders.subscribe(new NotificationService(prefs));
        orders.subscribe((event, user) -> System.out.println("audit " + event));
        orders.ship("ada");
        orders.ship("linus");
    }
}

interface Channel { void send(String user, String text); }

interface OrderListener { void on(String event, String user); }

// Subject: knows only the listener interface.
class OrderService {
    private final List<OrderListener> listeners = new ArrayList<>();

    void subscribe(OrderListener l) { listeners.add(l); }

    void ship(String user) {
        for (OrderListener l : listeners) l.on("SHIPPED", user);
    }
}

// Observer: turns an order event into messages on the user's channels.
class NotificationService implements OrderListener {
    private final Map<String, List<Channel>> prefs;

    NotificationService(Map<String, List<Channel>> p) { this.prefs = p; }

    public void on(String event, String user) {
        String text = "order " + event.toLowerCase();
        for (var c : prefs.getOrDefault(user, List.of())) c.send(user, text);
    }
}
