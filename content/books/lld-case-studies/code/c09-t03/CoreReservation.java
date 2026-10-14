import java.time.*;
import java.util.*;

public class CoreReservation {
  public static void main(String[] args) {
    Clock clock = Clock.fixed(
        Instant.parse("2026-03-01T09:00:00Z"), ZoneOffset.UTC);
    RoomType dlx = new RoomType("DLX", 650000L);
    InMemoryInventory inv = new InMemoryInventory(Map.of("DLX", 1));
    ReservationService svc = new ReservationService(inv,
        new WeekdayWeekendPricing(),
        (amount, token) -> token.startsWith("tok-ok"), clock);
    LocalDate in = LocalDate.of(2026, 3, 13);           // a Friday
    Reservation a = svc.hold("G-7", dlx, in, in.plusDays(2));
    System.out.println("held " + a);
    try {
      svc.hold("G-9", dlx, in.plusDays(1), in.plusDays(3));
    } catch (IllegalStateException e) {
      System.out.println("G-9: " + e.getMessage());
    }
    System.out.println("confirmed " + svc.confirm(a.id, "tok-ok"));
    System.out.println("free DLX on 03-14: "
        + inv.free("DLX", in.plusDays(1)));
  }
}

enum Status { HELD, CONFIRMED, CANCELLED, EXPIRED }
record RoomType(String code, long nightlyRateMinor) {}
interface InventoryStore {             // all nights or none
  boolean reserve(String typeCode, List<LocalDate> nights);
  void release(String typeCode, List<LocalDate> nights);
}
interface PricingStrategy { long priceOf(RoomType t, LocalDate night); }
interface PaymentGateway { boolean charge(long amountMinor, String token); }

class InMemoryInventory implements InventoryStore {
  private final Map<String, Integer> rooms;
  private final Map<String, Integer> taken = new HashMap<>();
  InMemoryInventory(Map<String, Integer> rooms) { this.rooms = rooms; }
  int free(String t, LocalDate n) {
    return rooms.get(t) - taken.getOrDefault(t + "@" + n, 0);
  }
  public synchronized boolean reserve(String t, List<LocalDate> nights) {
    for (LocalDate n : nights) if (free(t, n) == 0) return false;
    for (LocalDate n : nights) taken.merge(t + "@" + n, 1, Integer::sum);
    return true;
  }
  public synchronized void release(String t, List<LocalDate> nights) {
    for (LocalDate n : nights) taken.merge(t + "@" + n, -1, Integer::sum);
  }
}

class WeekdayWeekendPricing implements PricingStrategy {
  public long priceOf(RoomType t, LocalDate night) {
    DayOfWeek d = night.getDayOfWeek();
    boolean weekend = d == DayOfWeek.FRIDAY || d == DayOfWeek.SATURDAY;
    return weekend ? t.nightlyRateMinor() * 120 / 100 : t.nightlyRateMinor();
  }
}

class Reservation {
  final String id; final RoomType type; final List<LocalDate> nights;
  final Instant holdUntil; long amountMinor; Status status = Status.HELD;
  Reservation(String id, RoomType t, List<LocalDate> n, Instant until) {
    this.id = id; type = t; nights = n; holdUntil = until;
  }
  public String toString() {
    return id + " " + nights + " " + amountMinor + " " + status;
  }
}

class ReservationService {               // facade over the policies
  private final InventoryStore inv; private final PricingStrategy pricing;
  private final PaymentGateway gateway; private final Clock clock;
  private final Map<String, Reservation> byId = new HashMap<>();
  private int seq = 0;
  ReservationService(InventoryStore inv, PricingStrategy pricing,
      PaymentGateway gateway, Clock clock) {
    this.inv = inv; this.pricing = pricing;
    this.gateway = gateway; this.clock = clock;
  }
  Reservation hold(String guest, RoomType t, LocalDate in, LocalDate out) {
    List<LocalDate> nights = in.datesUntil(out).toList();
    if (!inv.reserve(t.code(), nights))
      throw new IllegalStateException("no " + t.code() + " for those nights");
    Reservation r = new Reservation("RS-" + (++seq), t, nights,
        clock.instant().plus(Duration.ofMinutes(15)));
    for (LocalDate n : nights) r.amountMinor += pricing.priceOf(t, n);
    byId.put(r.id, r);
    return r;
  }
  Reservation confirm(String id, String payToken) {
    Reservation r = byId.get(id);
    if (r.status != Status.HELD || !clock.instant().isBefore(r.holdUntil))
      throw new IllegalStateException("hold no longer valid");
    if (!gateway.charge(r.amountMinor, payToken)) {
      inv.release(r.type.code(), r.nights);     // give the nights back
      r.status = Status.CANCELLED;
      throw new IllegalStateException("payment declined");
    }
    r.status = Status.CONFIRMED;
    return r;
  }
}
