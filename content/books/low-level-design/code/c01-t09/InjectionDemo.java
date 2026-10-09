import java.util.ArrayList;
import java.util.List;

public class InjectionDemo {
    public static void main(String[] args) {
        // composition root: the one place that picks concrete classes
        OrderService live = new OrderService(new ConsoleNotifier());
        live.place("A-17", "ada@example.com");

        RecordingNotifier fake = new RecordingNotifier();
        OrderService underTest = new OrderService(fake);
        underTest.place("B-02", "lin@example.com");
        System.out.println("fake recorded " + fake.sent);
    }
}

interface Notifier {
    void send(String to, String text);
}

class ConsoleNotifier implements Notifier {
    @Override public void send(String to, String text) {
        System.out.println("to " + to + ": " + text);
    }
}

class RecordingNotifier implements Notifier {     // a test double
    final List<String> sent = new ArrayList<>();

    @Override public void send(String to, String text) { sent.add(to); }
}

class OrderService {
    private final Notifier notifier;              // knows the role only

    OrderService(Notifier notifier) {             // constructor injection
        this.notifier = notifier;
    }

    void place(String orderId, String email) {
        notifier.send(email, "order " + orderId + " placed");
    }
}
