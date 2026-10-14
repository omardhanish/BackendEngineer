import java.util.*;

public class DoublesDemo {
    public static void main(String[] args) {
        var store = new InMemoryOrders();                 // fake
        var spy = new SpySender();                        // spy
        PaymentGateway approve = (id, cents) -> true;     // stub
        PaymentGateway decline = (id, cents) -> false;    // stub
        new Checkout(approve, store, spy, new DummyAudit()).pay("O-1", 1999);
        new Checkout(decline, store, spy, new DummyAudit()).pay("O-2", 500);
        check("approved order is PAID", "PAID".equals(store.status("O-1")));
        check("declined order is FAILED", "FAILED".equals(store.status("O-2")));
        check("receipt only for O-1", spy.sent().equals(List.of("O-1")));
    }
    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}
interface PaymentGateway { boolean charge(String orderId, long cents); }
interface OrderStore { void save(String orderId, String status); }
interface ReceiptSender { void send(String orderId); }
interface AuditLog { void record(String event); }
// The class under test: it only talks to interfaces it was given.
final class Checkout {
    private final PaymentGateway gateway;
    private final OrderStore store;
    private final ReceiptSender sender;
    private final AuditLog audit;
    Checkout(PaymentGateway g, OrderStore s, ReceiptSender r, AuditLog a) {
        gateway = Objects.requireNonNull(g);
        store = Objects.requireNonNull(s);
        sender = Objects.requireNonNull(r);
        audit = Objects.requireNonNull(a);
    }
    void pay(String orderId, long cents) {
        if (cents <= 0) {
            audit.record("bad amount " + orderId);
            throw new IllegalArgumentException("amount must be > 0");
        }
        boolean paid = gateway.charge(orderId, cents);
        store.save(orderId, paid ? "PAID" : "FAILED");
        if (paid) sender.send(orderId);
    }
}
// Fake: a real, working implementation, just in memory.
final class InMemoryOrders implements OrderStore {
    private final Map<String, String> rows = new HashMap<>();
    public void save(String id, String status) { rows.put(id, status); }
    String status(String orderId) { return rows.get(orderId); }
}
// Spy: does nothing useful but remembers every call for later checks.
final class SpySender implements ReceiptSender {
    private final List<String> calls = new ArrayList<>();
    public void send(String orderId) { calls.add(orderId); }
    List<String> sent() { return List.copyOf(calls); }
}
// Dummy: fills a parameter; these tests must never reach it.
final class DummyAudit implements AuditLog {
    public void record(String event) { throw new AssertionError("not used"); }
}
