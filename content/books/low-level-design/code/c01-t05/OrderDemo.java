import java.util.ArrayList;
import java.util.List;

public class OrderDemo {
    public static void main(String[] args) {
        Order order = new Order(new Customer("Asha"));
        order.add("tea", 2, 40);
        order.add("cake", 1, 120);
        System.out.println(order.summary());
        System.out.println("paid " + order.pay(new CardPayment()));
    }
}

record Customer(String name) {}
record OrderLine(String item, int qty, long price) {}

interface Payment { boolean charge(long amount); }

class CardPayment implements Payment {    // realization: <|.. in the diagram
    public boolean charge(long amount) { return amount > 0; }
}

class Order {
    private final List<OrderLine> lines = new ArrayList<>(); // composition
    private final Customer customer;      // association: -->

    Order(Customer customer) { this.customer = customer; }

    void add(String item, int qty, long price) {
        lines.add(new OrderLine(item, qty, price)); // Order creates lines
    }

    long total() {
        return lines.stream().mapToLong(l -> l.qty() * l.price()).sum();
    }

    String summary() {
        return customer.name() + ": " + lines.size() + " lines, " + total();
    }

    boolean pay(Payment payment) {        // dependency: a parameter only
        return payment.charge(total());
    }
}
