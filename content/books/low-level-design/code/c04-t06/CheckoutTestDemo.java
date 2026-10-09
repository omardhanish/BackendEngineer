import java.util.ArrayList;
import java.util.List;

public class CheckoutTestDemo {
    static int failed = 0;
    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failed++;
    }
    public static void main(String[] args) {
        RecordingGateway gateway = new RecordingGateway(true);
        Checkout checkout = new Checkout(gateway);
        check("charges the cart total", checkout.pay("c1", 1200));
        check("gateway saw one call", gateway.calls.equals(List.of("c1:1200")));
        check("reports a decline",
                !new Checkout(new RecordingGateway(false)).pay("c2", 500));
        boolean threw = false;
        try { checkout.pay("c3", 0); }
        catch (IllegalArgumentException e) { threw = true; }
        check("rejects an empty cart", threw);
        check("empty cart never charged", gateway.calls.size() == 1);
        System.out.println(failed == 0 ? "all green" : failed + " failed");
    }
}

interface PaymentGateway { boolean charge(String customer, long cents); }

class RecordingGateway implements PaymentGateway {      // test double
    final List<String> calls = new ArrayList<>();
    private final boolean approve;
    RecordingGateway(boolean approve) { this.approve = approve; }
    @Override public boolean charge(String customer, long cents) {
        calls.add(customer + ":" + cents);           // record, then answer
        return approve;
    }
}

class Checkout {
    private final PaymentGateway gateway;             // injected seam
    Checkout(PaymentGateway gateway) { this.gateway = gateway; }
    boolean pay(String customer, long cents) {
        if (cents <= 0) throw new IllegalArgumentException("empty cart");
        return gateway.charge(customer, cents);
    }
}
