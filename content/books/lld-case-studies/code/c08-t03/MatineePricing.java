import java.time.*;
import java.util.*;

public class MatineePricing {
  public static void main(String[] args) {
    PricingStrategy base = new StandardPricing();
    PricingStrategy pricing = new MatineeDiscount(base, 20);
    Map<String, SeatType> seats = Map.of("A1", SeatType.REGULAR);
    Show morning = new Show("SH-2",
        Instant.parse("2026-01-15T10:00:00Z"), seats);
    Show evening = new Show("SH-1",
        Instant.parse("2026-01-15T18:30:00Z"), seats);
    for (Show s : List.of(morning, evening))
      System.out.println(s.id() + " A1 = " + pricing.priceOf(s, "A1"));
  }
}

enum SeatType { REGULAR, PREMIUM }
record Show(String id, Instant startsAt, Map<String, SeatType> seats) {}
interface PricingStrategy { long priceOf(Show show, String seatId); }

class StandardPricing implements PricingStrategy {
  public long priceOf(Show show, String seatId) {
    return show.seats().get(seatId) == SeatType.PREMIUM ? 40000 : 25000;
  }
}

// New rule, new class: BookingService and StandardPricing are untouched.
class MatineeDiscount implements PricingStrategy {
  private final PricingStrategy inner;
  private final int percentOff;
  MatineeDiscount(PricingStrategy inner, int percentOff) {
    this.inner = inner; this.percentOff = percentOff;
  }
  public long priceOf(Show show, String seatId) {
    long price = inner.priceOf(show, seatId);
    int hour = show.startsAt().atZone(ZoneOffset.UTC).getHour();
    return hour < 13 ? price * (100 - percentOff) / 100 : price;
  }
}
