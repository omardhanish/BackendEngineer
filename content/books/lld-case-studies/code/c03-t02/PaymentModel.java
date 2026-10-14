import java.util.*;

public class PaymentModel {
  public static void main(String[] args) {
    PaymentMethod upi = new UPIPayment("asha@okbank");
    Payment p = new Payment("P-1", "ORD-7", "k-1",
        new Money(49900, "INR"), upi);
    p.markSucceeded();
    System.out.println(p);
    p.refund("R-1", 20000);
    System.out.println(p);
    p.refund("R-2", 29900);
    System.out.println(p + " refunds=" + p.refunds().size());
    tryIt(() -> p.refund("R-3", 1));
    tryIt(() -> new UPIPayment("asha"));
    tryIt(() -> new CardPayment("tok_9f", "12345", "VISA"));
    tryIt(() -> new Money(-100, "INR"));
  }

  static void tryIt(Runnable r) {
    try { r.run(); }
    catch (IllegalArgumentException | IllegalStateException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

record Money(long minor, String currency) {
  Money {
    if (minor < 0) throw new IllegalArgumentException("negative amount");
    if (!currency.matches("[A-Z]{3}"))
      throw new IllegalArgumentException("bad currency " + currency);
  }
  Money plus(Money o) { return new Money(minor + o.minor, currency); }
  boolean exceeds(Money o) { return minor > o.minor; }
}

interface PaymentMethod { String describe(); }

record UPIPayment(String vpa) implements PaymentMethod {
  UPIPayment {
    if (!vpa.matches("[\\w.-]+@\\w+"))
      throw new IllegalArgumentException("bad UPI id " + vpa);
  }
  public String describe() { return "UPI " + vpa; }
}

// Holds a gateway token and display fields, never the card number.
record CardPayment(String token, String last4, String network)
    implements PaymentMethod {
  CardPayment {
    if (!last4.matches("\\d{4}"))
      throw new IllegalArgumentException("last4 must be 4 digits");
  }
  public String describe() { return network + " *" + last4; }
}

enum PaymentStatus {
  CREATED, PROCESSING, SUCCEEDED, FAILED, PARTIALLY_REFUNDED, REFUNDED
}

record Refund(String id, String paymentId, Money amount) {}

class Payment {
  private final String id, orderId, idempotencyKey;
  private final Money amount;
  private final PaymentMethod method;
  private PaymentStatus status = PaymentStatus.CREATED;
  private Money refunded;
  private final List<Refund> refunds = new ArrayList<>();

  Payment(String id, String orderId, String idempotencyKey, Money amount,
      PaymentMethod method) {
    if (amount.minor() == 0)
      throw new IllegalArgumentException("amount must be positive");
    this.id = id; this.orderId = orderId;
    this.idempotencyKey = idempotencyKey;
    this.amount = amount; this.method = method;
    this.refunded = new Money(0, amount.currency());
  }
  void markSucceeded() { status = PaymentStatus.SUCCEEDED; } // page 4
  List<Refund> refunds() { return List.copyOf(refunds); }

  Refund refund(String refundId, long minor) {
    if (minor <= 0) throw new IllegalArgumentException("refund must be > 0");
    if (status != PaymentStatus.SUCCEEDED
        && status != PaymentStatus.PARTIALLY_REFUNDED)
      throw new IllegalStateException("cannot refund in " + status);
    Money ask = new Money(minor, amount.currency());
    if (refunded.plus(ask).exceeds(amount))
      throw new IllegalStateException("refund exceeds payment");
    refunded = refunded.plus(ask);
    status = refunded.equals(amount) ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
    Refund r = new Refund(refundId, id, ask);
    refunds.add(r);
    return r;
  }
  public String toString() {
    return id + " " + method.describe() + " " + amount.minor() + " "
        + status + " refunded=" + refunded.minor();
  }
}
