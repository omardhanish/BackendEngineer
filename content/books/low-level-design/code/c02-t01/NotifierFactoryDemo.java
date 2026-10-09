import java.util.*;
import java.util.function.Supplier;

public class NotifierFactoryDemo {
    public static void main(String[] args) {
        NotifierFactory.register("push", PushNotifier::new);
        for (String raw : List.of("email", "sms", "push")) {
            Notifier n = NotifierFactory.create(raw);
            System.out.println(n.send("Order A-17 shipped"));
        }
        try {
            NotifierFactory.create("fax");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

interface Notifier {
    String send(String message);
}

class EmailNotifier implements Notifier {
    public String send(String m) { return "EMAIL to inbox: " + m; }
}

class SmsNotifier implements Notifier {
    public String send(String m) { return "SMS (160 max): " + m; }
}

class PushNotifier implements Notifier {
    public String send(String m) { return "PUSH to app: " + m; }
}

final class NotifierFactory {
    private static final Map<String, Supplier<Notifier>> REGISTRY =
        new HashMap<>();
    static {
        register("email", EmailNotifier::new);
        register("sms", SmsNotifier::new);
    }
    private NotifierFactory() { }

    static void register(String channel, Supplier<Notifier> maker) {
        REGISTRY.put(channel, maker);
    }

    static Notifier create(String channel) {
        Supplier<Notifier> maker = REGISTRY.get(channel);
        if (maker == null) throw new IllegalArgumentException(channel);
        return maker.get();
    }
}
