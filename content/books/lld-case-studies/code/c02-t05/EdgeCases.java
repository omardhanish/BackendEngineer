import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class EdgeCases {
  public static void main(String[] args) {
    Lot lot = new Lot(new FlakyGateway());
    System.out.println(lot.enter("KA01AB1234"));
    System.out.println(lot.enter("KA01AB1234"));       // same plate again
    System.out.println(lot.exit("T-1"));               // not paid yet
    System.out.println(lot.pay("T-1", 15000, "pay-1")); // card declined
    System.out.println(lot.pay("T-1", 15000, "pay-1")); // same key again
    System.out.println(lot.pay("T-1", 15000, "pay-2")); // new attempt
    System.out.println(lot.pay("T-1", 15000, "pay-2")); // double tap
    System.out.println(lot.pay("T-1", 15000, "pay-3")); // stray retry
    System.out.println("charges sent: " + lot.gateway.calls.get());
    System.out.println(lot.exit("T-1"));
    System.out.println(lot.enter("KA01AB1234"));       // back next day
  }
}

enum TicketStatus { ACTIVE, PAYING, PAID, EXITED }

class FlakyGateway {                          // declines the first charge
  final AtomicInteger calls = new AtomicInteger();
  boolean charge(long amountMinor) { return calls.incrementAndGet() > 1; }
}

class Lot {
  final FlakyGateway gateway;
  private final AtomicInteger ids = new AtomicInteger();
  private final Map<String, String> inside = new ConcurrentHashMap<>();
  private final Map<String, TicketStatus> status = new ConcurrentHashMap<>();
  private final Map<String, String> byKey = new ConcurrentHashMap<>();

  Lot(FlakyGateway gateway) { this.gateway = gateway; }

  String enter(String plate) {
    String id = "T-" + ids.incrementAndGet();  // gaps are fine
    String prior = inside.putIfAbsent(plate, id);
    if (prior != null) return plate + " refused: ALREADY_INSIDE " + prior;
    status.put(id, TicketStatus.ACTIVE);
    return plate + " entered with " + id;
  }

  String pay(String ticketId, long amount, String key) {
    return byKey.computeIfAbsent(key, k -> k + ": " + charge(ticketId, amount));
  }

  private String charge(String ticketId, long amount) {
    if (!status.replace(ticketId, TicketStatus.ACTIVE, TicketStatus.PAYING))
      return "ALREADY_PAID_OR_UNKNOWN";
    boolean ok = gateway.charge(amount);
    status.put(ticketId, ok ? TicketStatus.PAID : TicketStatus.ACTIVE);
    return ok ? "PAID " + amount : "DECLINED";
  }

  String exit(String ticketId) {
    if (!status.replace(ticketId, TicketStatus.PAID, TicketStatus.EXITED))
      return ticketId + " refused: NOT_PAID, barrier stays down";
    inside.values().remove(ticketId);
    return ticketId + " exited, barrier up";
  }
}
