public class PatternDemo {
    public static void main(String[] args) {
        Notifier sms = Notifier.of("sms");
        Notifier mail = Notifier.of("email");
        Notifier urgent = new Tagged("[urgent] ", sms);

        mail.send("room 4 is free");
        urgent.send("room 4 needs a projector");
    }
}

interface Notifier {
    void send(String text);

    static Notifier of(String channel) {  // Factory: hides the implementation
        return switch (channel) {
            case "sms" -> text -> System.out.println("SMS: " + text);
            case "email" -> text -> System.out.println("Mail: " + text);
            default -> throw new IllegalArgumentException(channel);
        };
    }
}

class Tagged implements Notifier {        // Decorator: wraps and adds
    private final String tag;
    private final Notifier inner;

    Tagged(String tag, Notifier inner) {
        this.tag = tag;
        this.inner = inner;
    }

    @Override
    public void send(String text) {
        inner.send(tag + text);
    }
}
