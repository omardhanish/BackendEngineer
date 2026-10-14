import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class InvertedDemo {
    public static void main(String[] args) {
        // Production wiring: the only place that names a concrete class.
        var live = new InvoiceService(new EmailNotifier("mail.corp.test"));
        live.issue("billing@acme.test", 12_000);

        // Test wiring: same policy, a fake that only records.
        var fake = new RecordingNotifier();
        var tested = new InvoiceService(fake);
        tested.issue("billing@acme.test", 12_000);
        System.out.println("Fake recorded: " + fake.seen());
    }
}

record Invoice(String id, String customer, long cents) {
    Invoice {
        Objects.requireNonNull(customer, "customer");
        if (cents <= 0) throw new IllegalArgumentException("amount <= 0");
    }
}

// The abstraction belongs to the policy and is shaped by its needs.
interface InvoiceNotifier { void invoiceIssued(Invoice invoice); }

final class InvoiceService {
    private final InvoiceNotifier notifier;
    private int next = 1;
    InvoiceService(InvoiceNotifier notifier) {
        this.notifier = Objects.requireNonNull(notifier, "notifier");
    }
    String issue(String customer, long cents) {
        var invoice = new Invoice("INV-" + next++, customer, cents);
        notifier.invoiceIssued(invoice);
        return invoice.id();
    }
}

// Details depend on the abstraction, never the other way round.
final class EmailNotifier implements InvoiceNotifier {
    private final String host;
    EmailNotifier(String host) { this.host = Objects.requireNonNull(host); }
    public void invoiceIssued(Invoice inv) {
        System.out.println("[smtp " + host + "] to " + inv.customer()
                + ": " + inv.id() + " due " + String.format(
                        "%d.%02d", inv.cents() / 100, inv.cents() % 100));
    }
}

final class RecordingNotifier implements InvoiceNotifier {
    private final List<String> seen = new ArrayList<>();
    public void invoiceIssued(Invoice inv) { seen.add(inv.id()); }
    List<String> seen() { return List.copyOf(seen); }
}
