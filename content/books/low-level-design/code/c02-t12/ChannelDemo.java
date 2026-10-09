import java.util.List;

public class ChannelDemo {
    public static void main(String[] args) {
        for (ChannelType type : List.of(ChannelType.EMAIL, ChannelType.SMS)) {
            Channel channel = new Retrying(type.create(), 3);
            channel.send("ada", "your order shipped");
        }
    }
}

// Strategy: one way to deliver a message.
interface Channel { void send(String user, String text); }

// Factory: callers name a type, never a concrete class.
enum ChannelType {
    EMAIL, SMS;
    Channel create() {
        return switch (this) {
            case EMAIL -> (u, t) -> System.out.println("email " + u + ": " + t);
            case SMS -> new FlakySms();
        };
    }
}

class FlakySms implements Channel { // fails once, then works
    private int calls = 0;
    public void send(String user, String text) {
        if (++calls == 1) throw new IllegalStateException("gateway busy");
        System.out.println("sms " + user + ": " + text);
    }
}

// Decorator: the same interface, plus retries around any channel.
record Retrying(Channel inner, int attempts) implements Channel {
    public void send(String user, String text) {
        for (int i = 1; i <= attempts; i++) {
            try { inner.send(user, text); return; }
            catch (IllegalStateException e) {
                System.out.println("  try " + i + ": " + e.getMessage());
            }
        }
        System.out.println("  gave up after " + attempts + " tries");
    }
}
