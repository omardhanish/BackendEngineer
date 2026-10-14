import java.util.*;

public class OverSpecifiedMock {
    public static void main(String[] args) {
        List<String> paid = List.of("O-1", "O-2");
        for (Notifier version : List.of(new OneByOne(), new Batched())) {
            var mock = new StrictMock(List.of("send O-1", "send O-2"));
            version.notifyPaid(paid, mock);
            System.out.println(version.name() + " mock test: " + mock.verify());
            var inbox = new FakeInbox();
            version.notifyPaid(paid, inbox);
            boolean ok = inbox.received().equals(Set.of("O-1", "O-2"));
            System.out.println(version.name() + " state test: "
                    + (ok ? "PASS" : "FAIL"));
        }
    }
}
interface ReceiptSender {
    void send(String orderId);
    void sendBatch(List<String> orderIds);
}
interface Notifier {
    String name();
    void notifyPaid(List<String> orderIds, ReceiptSender sender);
}
// Version 1 and its refactor: customers get exactly the same receipts.
final class OneByOne implements Notifier {
    public String name() { return "v1"; }
    public void notifyPaid(List<String> ids, ReceiptSender s) {
        ids.forEach(s::send);
    }
}
final class Batched implements Notifier {
    public String name() { return "v2"; }
    public void notifyPaid(List<String> ids, ReceiptSender s) {
        s.sendBatch(ids);
    }
}
// Mock: expects an exact list of calls, then verifies them afterwards.
final class StrictMock implements ReceiptSender {
    private final List<String> expected;
    private final List<String> actual = new ArrayList<>();
    StrictMock(List<String> expected) { this.expected = List.copyOf(expected); }
    public void send(String id) { actual.add("send " + id); }
    public void sendBatch(List<String> ids) { actual.add("sendBatch " + ids); }
    String verify() {
        return actual.equals(expected) ? "PASS" : "FAIL, got " + actual;
    }
}
// Fake: a working inbox; the test checks only what customers received.
final class FakeInbox implements ReceiptSender {
    private final Set<String> received = new TreeSet<>();
    public void send(String id) { received.add(id); }
    public void sendBatch(List<String> ids) { received.addAll(ids); }
    Set<String> received() { return Set.copyOf(received); }
}
