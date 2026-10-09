import java.util.ArrayList;
import java.util.List;
public class GraspDemo {
    public static void main(String[] args) {
        var controller = new CheckoutController(new InMemoryOrders());
        controller.checkout("ana", "pen", 120, 3);
        controller.checkout("raj", "ink", 900, 1);
    }
}

class CheckoutController {              // Controller: first stop after the UI
    private final Orders orders;
    CheckoutController(Orders orders) { this.orders = orders; }
    void checkout(String customer, String sku, long price, int qty) {
        Order order = new Order(customer);
        order.add(sku, price, qty);
        orders.save(order);
    }
}

class Order {
    private final String customer;
    private final List<OrderLine> lines = new ArrayList<>();
    Order(String customer) { this.customer = customer; }
    String customer() { return customer; }
    void add(String sku, long price, int qty) {   // Creator: holds the lines
        lines.add(new OrderLine(sku, price, qty));
    }
    long total() {                      // Information Expert: has the lines
        return lines.stream().mapToLong(OrderLine::subtotal).sum();
    }
}
record OrderLine(String sku, long price, int qty) {
    long subtotal() { return price * qty; }
}
interface Orders { void save(Order order); }   // Indirection

class InMemoryOrders implements Orders {      // Pure Fabrication
    private final List<Order> saved = new ArrayList<>();
    @Override public void save(Order order) {
        saved.add(order);
        System.out.println("saved #" + saved.size() + " " + order.customer()
                + " total " + order.total());
    }
}
