import java.util.*;

public class PaymentLifecycle {
  public static void main(String[] args) {
    Payment p1 = new Payment("P-1");
    p1.moveTo(PaymentStatus.PROCESSING);
    p1.moveTo(PaymentStatus.SUCCEEDED);
    p1.moveTo(PaymentStatus.SUCCEEDED);          // duplicate webhook
    p1.moveTo(PaymentStatus.PARTIALLY_REFUNDED);
    p1.moveTo(PaymentStatus.REFUNDED);
    Payment p2 = new Payment("P-2");
    p2.moveTo(PaymentStatus.PROCESSING);
    p2.moveTo(PaymentStatus.FAILED);
    p2.moveTo(PaymentStatus.SUCCEEDED);          // late, conflicting event
    System.out.println("history " + p1.id + ": " + p1.history);
  }
}

enum PaymentStatus {
  CREATED, PROCESSING, SUCCEEDED, FAILED, PARTIALLY_REFUNDED, REFUNDED;

  private static final Map<PaymentStatus, Set<PaymentStatus>> NEXT =
      new EnumMap<>(PaymentStatus.class);
  static {
    NEXT.put(CREATED, EnumSet.of(PROCESSING, FAILED));
    NEXT.put(PROCESSING, EnumSet.of(SUCCEEDED, FAILED));
    NEXT.put(SUCCEEDED, EnumSet.of(PARTIALLY_REFUNDED, REFUNDED));
    NEXT.put(PARTIALLY_REFUNDED,
        EnumSet.of(PARTIALLY_REFUNDED, REFUNDED));
    NEXT.put(FAILED, EnumSet.noneOf(PaymentStatus.class));
    NEXT.put(REFUNDED, EnumSet.noneOf(PaymentStatus.class));
  }
  boolean canMoveTo(PaymentStatus to) { return NEXT.get(this).contains(to); }
}

class Payment {
  final String id;
  PaymentStatus status = PaymentStatus.CREATED;
  final List<PaymentStatus> history = new ArrayList<>(List.of(status));
  Payment(String id) { this.id = id; }

  void moveTo(PaymentStatus to) {
    if (to == status && !status.canMoveTo(to)) {
      System.out.println(id + " ignored duplicate " + to);
      return;
    }
    if (!status.canMoveTo(to)) {
      System.out.println(id + " refused " + status + " -> " + to
          + " (raise alert)");
      return;
    }
    System.out.println(id + " " + status + " -> " + to);
    status = to;
    history.add(to);
  }
}
