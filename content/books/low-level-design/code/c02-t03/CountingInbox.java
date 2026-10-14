import java.util.ArrayList;
import java.util.List;

public class CountingInbox {
    public static void main(String[] args) {
        var inbox = new AuditedInbox();
        inbox.receiveAll(List.of("hi", "invoice", "lunch?"));
        System.out.println("stored:  " + inbox.size());
        System.out.println("audited: " + inbox.audited());
    }
}

// Not designed for extension, yet not final either.
class Inbox {
    private final List<String> messages = new ArrayList<>();

    void receive(String msg) { messages.add(msg); }

    // Implementation detail: loops over receive(). Nobody documented it.
    void receiveAll(List<String> batch) {
        for (String m : batch) receive(m);
    }

    int size() { return messages.size(); }
}

// Subclass counts every message, overriding both entry points.
class AuditedInbox extends Inbox {
    private int audited;

    @Override void receive(String msg) {
        audited++;
        super.receive(msg);
    }

    @Override void receiveAll(List<String> batch) {
        audited += batch.size();
        super.receiveAll(batch); // calls this.receive() again
    }

    int audited() { return audited; }
}
