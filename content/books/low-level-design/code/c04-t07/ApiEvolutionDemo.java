import java.util.List;

public class ApiEvolutionDemo {
    public static void main(String[] args) {
        List<Notifier> all = List.of(new LegacySms(), new EmailNotifier());
        for (Notifier n : all) {
            System.out.println(n.send("ada", "Room booked"));
            System.out.println(n.send("ada", "Room booked", Priority.HIGH));
        }
    }
}

enum Priority { NORMAL, HIGH }

interface Notifier {
    String send(String to, String text);                       // v1

    default String send(String to, String text, Priority p) {  // added in v2
        String prefix = p == Priority.HIGH ? "[!] " : "";
        return send(to, prefix + text);
    }
}

class LegacySms implements Notifier {      // written for v1, never edited
    public String send(String to, String text) {
        return "sms to " + to + ": " + text;
    }
}

class EmailNotifier implements Notifier {  // written for v2
    public String send(String to, String text) {
        return send(to, text, Priority.NORMAL);
    }

    @Override
    public String send(String to, String text, Priority p) {
        return "email to " + to + " (" + p + "): " + text;
    }
}
