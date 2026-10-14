import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class DesignedInbox {
    public static void main(String[] args) {
        var inbox = new AuditedInbox();
        inbox.receiveAll(List.of("hi", "invoice", "lunch?"));
        inbox.receive("standup");
        System.out.println("stored:  " + inbox.size());
        System.out.println("audited: " + inbox.audited());
    }
}

// Designed for extension: public flow is final, one documented hook.
abstract class Inbox {
    private final List<String> messages = new ArrayList<>();

    public final void receive(String msg) {
        Objects.requireNonNull(msg, "msg");
        messages.add(msg);
        onReceived(msg);
    }

    public final void receiveAll(List<String> batch) {
        for (String m : batch) receive(m);
    }

    public final int size() { return messages.size(); }

    /** Called once per stored message, after it is stored. */
    protected void onReceived(String msg) { }
}

// Leaf class: final, so nobody builds on its internals by accident.
final class AuditedInbox extends Inbox {
    private int audited;

    @Override protected void onReceived(String msg) { audited++; }

    int audited() { return audited; }
}
