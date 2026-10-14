import java.time.*;
import java.util.*;

public class GroundBooking {
  public static void main(String[] args) {
    BookingService svc = new BookingService(new InMemoryLedger(),
        new PeakOffPeakPricing(50000, 80000),
        (player, amount) -> !player.equals("P-3"));  // P-3's card fails
    LocalDate fri = LocalDate.of(2026, 3, 6), tue = LocalDate.of(2026, 3, 3);
    run(() -> svc.book("P-1", "C-1", fri.atTime(18, 0), 2));
    run(() -> svc.book("P-2", "C-1", fri.atTime(19, 0), 1));
    run(() -> svc.book("P-2", "C-1", tue.atTime(16, 0), 2));
    run(() -> svc.book("P-3", "C-1", fri.atTime(20, 0), 1));
    run(() -> svc.book("P-4", "C-1", fri.atTime(20, 0), 1));
  }
  static void run(java.util.function.Supplier<Booking> call) {
    try { System.out.println("booked  " + call.get()); }
    catch (IllegalStateException e) {
      System.out.println("refused " + e.getMessage());
    }
  }
}

record Booking(String id, String player, String court,
    LocalDateTime start, int hours, long amountMinor) {
  public String toString() {
    return id + " " + player + " " + court + " " + start + " x" + hours
        + "h = " + amountMinor;
  }
}

interface SlotLedger {        // who owns each court hour
  boolean reserveAll(String court, List<LocalDateTime> hrs, String id);
  void release(String id);
}
interface PricingStrategy {
  long priceOfHour(String court, LocalDateTime hourStart);
}
interface PaymentGateway { boolean charge(String player, long amount); }

class InMemoryLedger implements SlotLedger {
  private final Map<String, String> owner = new TreeMap<>();
  public synchronized boolean reserveAll(String court,
      List<LocalDateTime> hrs, String id) {
    for (LocalDateTime h : hrs)                   // check all first...
      if (owner.containsKey(court + "@" + h)) return false;
    for (LocalDateTime h : hrs) owner.put(court + "@" + h, id); // ...then write
    return true;
  }
  public synchronized void release(String id) {
    owner.values().removeIf(id::equals);
  }
}

class PeakOffPeakPricing implements PricingStrategy {
  private final long offPeak, peak;
  PeakOffPeakPricing(long offPeak, long peak) {
    this.offPeak = offPeak; this.peak = peak;
  }
  public long priceOfHour(String court, LocalDateTime h) {
    boolean weekend = h.getDayOfWeek().getValue() >= 6;
    boolean evening = h.getHour() >= 17 && h.getHour() < 22;
    return weekend || evening ? peak : offPeak;
  }
}

class BookingService {        // facade over the three collaborators
  private final SlotLedger ledger;
  private final PricingStrategy pricing;
  private final PaymentGateway payments;
  private int seq = 0;
  BookingService(SlotLedger l, PricingStrategy p, PaymentGateway g) {
    ledger = l; pricing = p; payments = g;
  }
  Booking book(String player, String court, LocalDateTime start, int n) {
    List<LocalDateTime> hrs = new ArrayList<>();
    for (int i = 0; i < n; i++) hrs.add(start.plusHours(i));
    String id = "BK-" + (++seq);
    if (!ledger.reserveAll(court, hrs, id))
      throw new IllegalStateException(id + " SLOT_TAKEN " + start);
    long total = 0;
    for (LocalDateTime h : hrs) total += pricing.priceOfHour(court, h);
    if (!payments.charge(player, total)) {
      ledger.release(id);                         // undo the reservation
      throw new IllegalStateException(id + " PAYMENT_DECLINED");
    }
    return new Booking(id, player, court, start, n, total);
  }
}
