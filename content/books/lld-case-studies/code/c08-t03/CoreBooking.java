import java.time.*;
import java.util.*;

public class CoreBooking {
  public static void main(String[] args) {
    Clock clock = Clock.fixed(
        Instant.parse("2026-01-15T18:00:00Z"), ZoneOffset.UTC);
    Show show = new Show("SH-1", Instant.parse("2026-01-15T18:30:00Z"),
        Map.of("A1", SeatType.REGULAR, "A2", SeatType.REGULAR,
               "P1", SeatType.PREMIUM));
    BookingService svc = new BookingService(new InMemorySeatLocks(),
        new StandardPricing(), new FakeGateway(), clock);
    SeatHold hold = svc.hold(show, "U-7", List.of("A2", "P1"));
    System.out.println("held " + hold.seatIds() + " until "
        + hold.expiresAt());
    try {
      svc.hold(show, "U-9", List.of("A1", "A2"));
    } catch (IllegalStateException e) {
      System.out.println("U-9: " + e.getMessage());
    }
    Booking booking = svc.confirm(show, hold.id(), "tok-ok");
    System.out.println(booking);
  }
}

enum SeatType { REGULAR, PREMIUM }
enum BookingStatus { PENDING, CONFIRMED, EXPIRED, CANCELLED }
record Show(String id, Instant startsAt, Map<String, SeatType> seats) {}
record SeatHold(String id, String userId, List<String> seatIds,
    Instant expiresAt) {}
record Booking(String id, String holdId, long amountMinor,
    BookingStatus status) {}
interface SeatLockProvider {
  boolean lockAll(String showId, List<String> seatIds, String holdId);
}
interface PricingStrategy { long priceOf(Show show, String seatId); }
interface PaymentGateway { boolean charge(long amountMinor, String token); }

class InMemorySeatLocks implements SeatLockProvider {
  private final Map<String, String> owner = new HashMap<>();
  public synchronized boolean lockAll(String showId, List<String> seats,
      String holdId) {
    for (String s : seats)
      if (owner.containsKey(showId + "/" + s)) return false;
    for (String s : seats) owner.put(showId + "/" + s, holdId);
    return true;
  }
}

class StandardPricing implements PricingStrategy {
  public long priceOf(Show show, String seatId) {
    return show.seats().get(seatId) == SeatType.PREMIUM ? 40000 : 25000;
  }
}

class FakeGateway implements PaymentGateway {
  public boolean charge(long amountMinor, String token) {
    return token.startsWith("tok-ok");
  }
}

class BookingService {
  private final SeatLockProvider locks;
  private final PricingStrategy pricing;
  private final PaymentGateway gateway;
  private final Clock clock;
  private final Map<String, SeatHold> holds = new HashMap<>();
  private int holdSeq = 0, bookingSeq = 0;
  BookingService(SeatLockProvider locks, PricingStrategy pricing,
      PaymentGateway gateway, Clock clock) {
    this.locks = locks; this.pricing = pricing;
    this.gateway = gateway; this.clock = clock;
  }
  SeatHold hold(Show show, String userId, List<String> seatIds) {
    String id = "H-" + (++holdSeq);
    if (!locks.lockAll(show.id(), seatIds, id))
      throw new IllegalStateException("seat already held " + seatIds);
    Instant until = clock.instant().plus(Duration.ofMinutes(10));
    SeatHold h = new SeatHold(id, userId, List.copyOf(seatIds), until);
    holds.put(id, h);
    return h;
  }
  Booking confirm(Show show, String holdId, String payToken) {
    SeatHold h = holds.get(holdId);
    if (h == null || !clock.instant().isBefore(h.expiresAt()))
      throw new IllegalStateException("hold expired");
    long total = 0;
    for (String s : h.seatIds()) total += pricing.priceOf(show, s);
    if (!gateway.charge(total, payToken))
      throw new IllegalStateException("payment declined");
    return new Booking("BK-" + (++bookingSeq), holdId, total,
        BookingStatus.CONFIRMED);
  }
}
