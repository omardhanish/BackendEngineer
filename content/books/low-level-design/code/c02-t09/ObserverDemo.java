import java.util.ArrayList;
import java.util.List;

public class ObserverDemo {
    public static void main(String[] args) {
        Checkout checkout = new Checkout();
        checkout.subscribe(new EmailSender());
        checkout.subscribe(new StockKeeper());
        checkout.subscribe(id -> System.out.println("audit: " + id));
        checkout.placeOrder("A-17");
    }
}

interface OrderListener {
    void onOrderPlaced(String orderId);
}

class Checkout {
    private final List<OrderListener> listeners = new ArrayList<>();

    void subscribe(OrderListener listener) {
        listeners.add(listener);
    }

    void placeOrder(String orderId) {
        System.out.println("saved order " + orderId);
        for (OrderListener l : listeners) {
            l.onOrderPlaced(orderId);
        }
    }
}

class EmailSender implements OrderListener {
    public void onOrderPlaced(String orderId) {
        System.out.println("email: receipt for " + orderId);
    }
}

class StockKeeper implements OrderListener {
    public void onOrderPlaced(String orderId) {
        System.out.println("stock: reserve items of " + orderId);
    }
}
