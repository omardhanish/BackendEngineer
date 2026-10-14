public class HardWiredDemo {
    public static void main(String[] args) {
        System.out.println("Unit test: issuing an invoice for ACME");
        var service = new InvoiceService();
        String id = service.issue("billing@acme.test", 12_000);
        System.out.println("Test checks id: " + id);
        System.out.println("Real emails sent by the test: "
                + SmtpMailer.emailsSent());
    }
}

// Low-level detail: talks to a mail server (simulated here).
final class SmtpMailer {
    private static int sent = 0; // stands in for the outside world
    SmtpMailer(String host) {
        System.out.println("[smtp] connecting to " + host);
    }
    void send(String to, String text) {
        sent++;
        System.out.println("[smtp] to " + to + ": " + text);
    }
    static int emailsSent() { return sent; }
}

// High-level policy that reaches down and builds its own detail.
final class InvoiceService {
    private final SmtpMailer mailer = new SmtpMailer("mail.corp.test");
    private int next = 1;

    String issue(String customer, long cents) {
        if (cents <= 0) throw new IllegalArgumentException("amount <= 0");
        String id = "INV-" + next++;
        String due = String.format("%d.%02d", cents / 100, cents % 100);
        mailer.send(customer, id + " due " + due);
        return id;
    }
}
