import java.util.ArrayList;
import java.util.List;

public class InvoicingDemo {
    public static void main(String[] args) {
        Outbox outbox = new Outbox();
        Invoicing invoicing = new Invoicing(new PriceBook(), outbox);
        invoicing.bill("ana", List.of("pen", "pad", "pen"));
        invoicing.bill("raj", List.of("ink"));
        outbox.sent().forEach(System.out::println);
    }
}

interface Sender { void send(String to, String text); }  // all it knows

class Outbox implements Sender {        // swap for email, SMS or a fake
    private final List<String> sent = new ArrayList<>();
    @Override public void send(String to, String text) {
        sent.add(to + ": " + text);
    }
    List<String> sent() { return List.copyOf(sent); }
}

class PriceBook {                       // cohesive: knows prices, nothing else
    long priceOf(String item) {
        return switch (item) {
            case "pen" -> 120;
            case "pad" -> 340;
            default -> 900;
        };
    }
}

class Invoicing {                       // coordinates; owns no details
    private final PriceBook prices;
    private final Sender sender;
    Invoicing(PriceBook prices, Sender sender) {
        this.prices = prices;
        this.sender = sender;
    }
    void bill(String customer, List<String> items) {
        long total = items.stream().mapToLong(prices::priceOf).sum();
        sender.send(customer, "total " + total);
    }
}
