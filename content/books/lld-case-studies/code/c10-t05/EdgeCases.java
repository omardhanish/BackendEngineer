import java.time.*;
import java.util.*;

public class EdgeCases {
  public static void main(String[] args) {
    Instant t0 = Instant.parse("2026-02-10T09:00:00Z");
    Service s = new Service(2, new FlakyIssuer(1));
    s.hold("PNR-1", 2, t0);
    System.out.println("left after hold:  " + s.left());
    s.expireHolds(t0.plusSeconds(16 * 60));
    System.out.println("left after sweep: " + s.left());
    s.onPaymentCaptured("PNR-1", t0.plusSeconds(17 * 60));
    s.hold("PNR-2", 1, t0.plusSeconds(20 * 60));
    s.onPaymentCaptured("PNR-2", t0.plusSeconds(22 * 60));
    s.retryTicketing("PNR-2");
    s.retryTicketing("PNR-2");
    s.onPaymentCaptured("PNR-2", t0.plusSeconds(23 * 60));
  }
}

interface TicketIssuer { List<String> issue(String pnr, int pax); }

class FlakyIssuer implements TicketIssuer {
  private int failuresLeft;
  private int next = 1;
  FlakyIssuer(int failures) { this.failuresLeft = failures; }
  public List<String> issue(String pnr, int pax) {
    if (failuresLeft-- > 0) throw new IllegalStateException("timeout");
    List<String> out = new ArrayList<>();
    for (int i = 0; i < pax; i++) out.add("TK-" + next++);
    return out;
  }
}

class Hold {
  final int pax; final Instant until;
  String status = "HELD";
  List<String> tickets = List.of();
  Hold(int pax, Instant until) { this.pax = pax; this.until = until; }
}

class Service {
  private int left;
  private final TicketIssuer issuer;
  private final Map<String, Hold> holds = new TreeMap<>();
  Service(int seats, TicketIssuer issuer) {
    this.left = seats; this.issuer = issuer;
  }
  synchronized int left() { return left; }

  synchronized void hold(String pnr, int pax, Instant now) {
    if (left < pax) throw new IllegalStateException("sold out");
    left -= pax;
    holds.put(pnr, new Hold(pax, now.plus(Duration.ofMinutes(15))));
  }

  synchronized void expireHolds(Instant now) {
    for (Map.Entry<String, Hold> e : holds.entrySet()) {
      Hold h = e.getValue();
      if (h.status.equals("HELD") && !now.isBefore(h.until)) {
        h.status = "EXPIRED";
        left += h.pax;                     // seats go back to the fare
        System.out.println(e.getKey() + " EXPIRED, seats back: " + h.pax);
      }
    }
  }

  synchronized void onPaymentCaptured(String pnr, Instant now) {
    Hold h = holds.get(pnr);
    if (h.status.equals("HELD") && !now.isBefore(h.until)) expireHolds(now);
    if (h.status.equals("EXPIRED")) {
      System.out.println(pnr + " is EXPIRED: refund the payment");
    } else if (!h.status.equals("HELD")) {
      System.out.println(pnr + " is " + h.status + ": duplicate, ignored");
    } else {
      h.status = "CONFIRMED";
      retryTicketing(pnr);
    }
  }

  synchronized void retryTicketing(String pnr) {
    Hold h = holds.get(pnr);
    if (!h.status.equals("CONFIRMED")) {
      System.out.println(pnr + " is " + h.status + ", tickets " + h.tickets);
      return;
    }
    try {
      h.tickets = issuer.issue(pnr, h.pax);
      h.status = "TICKETED";
      System.out.println(pnr + " TICKETED " + h.tickets);
    } catch (IllegalStateException e) {
      System.out.println(pnr + " CONFIRMED, ticketing failed: "
          + e.getMessage());
    }
  }
}
