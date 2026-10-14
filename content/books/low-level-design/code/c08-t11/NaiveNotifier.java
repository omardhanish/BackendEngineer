import java.util.Set;

public class NaiveNotifier {
    public static void main(String[] args) {
        OrderService orders = new OrderService();
        orders.ship("ann", "email");
        orders.ship("bob", "sms");
        orders.ship("cat", "push"); // a channel nobody wired in yet
        orders.ship("ann", "email"); // same event again
    }
}

final class OrderService {
    private final Set<String> optedOut = Set.of("bob");

    void ship(String user, String channel) {
        // ...order logic would be here; notifying is welded into it
        if (optedOut.contains(user)) return; // silent: no reason logged
        if (channel.equals("email")) {
            System.out.println("email to " + user + ": shipped");
        } else if (channel.equals("sms")) {
            System.out.println("sms to " + user + ": shipped");
        } else {
            System.out.println("dropped " + channel + " for " + user);
        }
        // payment, refund, delivery events each copy this whole block
    }
}
