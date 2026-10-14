import java.util.*;

public class CorePayment {
  public static void main(String[] args) {
    CardGateway cards = new CardGateway();
    PaymentService svc = new PaymentService(
        List.of(new UpiGateway(), cards), new FixedRetry(3));
    print(svc.pay("k-1", "ORD-1", 49900, new UPIPayment("asha@okbank")));
    print(svc.pay("k-1", "ORD-1", 49900, new UPIPayment("asha@okbank")));
    print(svc.pay("k-2", "ORD-2", 15000, new CardPayment("tok_flaky")));
    print(svc.pay("k-2", "ORD-2", 15000, new CardPayment("tok_flaky")));
    print(svc.pay("k-3", "ORD-3", 15000, new CardPayment("tok_declined")));
    System.out.println("card gateway calls: " + cards.calls);
  }
  static void print(Payment p) { System.out.println(p); }
}

enum PaymentStatus { PROCESSING, SUCCEEDED, FAILED }
enum GatewayResult { APPROVED, DECLINED, TIMEOUT }
interface PaymentMethod {}
record UPIPayment(String vpa) implements PaymentMethod {}
record CardPayment(String token) implements PaymentMethod {}

interface PaymentGateway {
  boolean supports(PaymentMethod m);
  GatewayResult charge(String paymentId, long amountMinor,
      PaymentMethod m);
}
interface RetryPolicy { boolean shouldRetry(int attempt, GatewayResult r); }

class UpiGateway implements PaymentGateway {
  public boolean supports(PaymentMethod m) { return m instanceof UPIPayment; }
  public GatewayResult charge(String id, long amt, PaymentMethod m) {
    return GatewayResult.APPROVED;
  }
}

class CardGateway implements PaymentGateway {   // fake, scripted by token
  int calls = 0;
  public boolean supports(PaymentMethod m) { return m instanceof CardPayment; }
  public GatewayResult charge(String id, long amt, PaymentMethod m) {
    calls++;
    String token = ((CardPayment) m).token();
    if (token.equals("tok_declined")) return GatewayResult.DECLINED;
    if (token.equals("tok_flaky") && calls == 1) return GatewayResult.TIMEOUT;
    return GatewayResult.APPROVED;
  }
}

class FixedRetry implements RetryPolicy {
  private final int maxAttempts;
  FixedRetry(int maxAttempts) { this.maxAttempts = maxAttempts; }
  public boolean shouldRetry(int attempt, GatewayResult r) {
    return r == GatewayResult.TIMEOUT && attempt < maxAttempts;
  }
}

class Payment {
  final String id, key; final long amountMinor;
  PaymentStatus status = PaymentStatus.PROCESSING; int attempts = 0;
  Payment(String id, String key, long amountMinor) {
    this.id = id; this.key = key; this.amountMinor = amountMinor;
  }
  public String toString() {
    return key + " -> " + id + " " + status + " attempts=" + attempts;
  }
}

class PaymentService {                          // facade
  private final List<PaymentGateway> gateways;
  private final RetryPolicy retry;
  private final Map<String, Payment> byKey = new HashMap<>();
  private int seq = 0;
  PaymentService(List<PaymentGateway> gateways, RetryPolicy retry) {
    this.gateways = gateways; this.retry = retry;
  }
  Payment pay(String key, String orderId, long amount, PaymentMethod m) {
    Payment known = byKey.get(key);
    if (known != null) return known;            // idempotent replay
    PaymentGateway gw = gateways.stream().filter(g -> g.supports(m))
        .findFirst().orElseThrow(() -> new IllegalArgumentException(
            "no gateway for " + m));
    Payment p = new Payment("P-" + (++seq), key, amount);
    byKey.put(key, p);                          // claim only once routable
    GatewayResult r;
    do {
      p.attempts++;
      r = gw.charge(p.id, amount, m);
    } while (retry.shouldRetry(p.attempts, r));
    p.status = r == GatewayResult.APPROVED ? PaymentStatus.SUCCEEDED
        : r == GatewayResult.DECLINED ? PaymentStatus.FAILED
        : PaymentStatus.PROCESSING;             // still unknown
    return p;
  }
}
