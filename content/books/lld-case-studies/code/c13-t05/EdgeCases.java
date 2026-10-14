import java.time.*;
import java.util.*;

public class EdgeCases {
  public static void main(String[] args) {
    Ledger ledger = new Ledger();
    LocalDateTime t = LocalDateTime.of(2026, 3, 6, 10, 0);   // fixed clock
    String hour = "C-1@18:00";
    say("10:00 BK-1 holds 18:00", ledger.hold(hour, "BK-1", t));
    say("10:05 BK-2 holds 18:00", ledger.hold(hour, "BK-2",
        t.plusMinutes(5)));
    say("10:11 BK-3 holds 18:00", ledger.hold(hour, "BK-3",
        t.plusMinutes(11)));
    boolean ok = ledger.confirm(hour, "BK-1", t.plusMinutes(12));
    say("10:12 BK-1 paid, confirm", ok);
    if (!ok) System.out.println("  BK-1 charge refunded in full");

    LocalDateTime start = LocalDateTime.of(2026, 3, 6, 18, 0);
    CancellationPolicy tiered = new TieredRefund();
    for (int before : new int[] {30, 5, 1}) {
      long r = tiered.refundMinor(160000, start, start.minusHours(before));
      System.out.printf("cancel %2dh before: refund %d%n", before, r);
    }
    CancellationPolicy closure = (paid, s, now) -> paid; // ground's fault
    System.out.println("court closed for rain 1h before: refund "
        + closure.refundMinor(160000, start, start.minusHours(1)));
  }

  static void say(String what, boolean ok) {
    System.out.println(what + ": " + (ok ? "yes" : "no"));
  }
}

class Ledger {                        // one entry per court hour
  record Entry(String bookingId, LocalDateTime holdUntil, boolean paid) {}
  private final Map<String, Entry> slots = new TreeMap<>();

  synchronized boolean hold(String key, String id, LocalDateTime now) {
    Entry e = slots.get(key);
    if (e != null && (e.paid() || now.isBefore(e.holdUntil())))
      return false;                   // taken, and the hold is still live
    slots.put(key, new Entry(id, now.plusMinutes(10), false));
    return true;
  }

  synchronized boolean confirm(String key, String id, LocalDateTime now) {
    Entry e = slots.get(key);
    if (e == null || !e.bookingId().equals(id)
        || !now.isBefore(e.holdUntil()))
      return false;                   // someone else owns it, or too late
    slots.put(key, new Entry(id, e.holdUntil(), true));
    return true;
  }
}

interface CancellationPolicy {
  long refundMinor(long paidMinor, LocalDateTime start, LocalDateTime now);
}

class TieredRefund implements CancellationPolicy {
  public long refundMinor(long paid, LocalDateTime start,
      LocalDateTime now) {
    long hours = Duration.between(now, start).toHours();
    if (hours >= 24) return paid;
    if (hours >= 4) return paid / 2;
    return 0;
  }
}
