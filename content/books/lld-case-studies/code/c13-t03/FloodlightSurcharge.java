import java.time.*;
import java.util.*;

public class FloodlightSurcharge {
  public static void main(String[] args) {
    PricingStrategy base = new PeakOffPeakPricing(50000, 80000);
    PricingStrategy lit = new Floodlights(base, Set.of("C-1"), 15000);
    LocalDate tue = LocalDate.of(2026, 3, 3);
    for (int hour : new int[] {7, 17, 19}) {
      LocalDateTime h = tue.atTime(hour, 0);
      System.out.printf("%s hall C-2=%d turf C-1=%d%n", h.toLocalTime(),
          lit.priceOfHour("C-2", h), lit.priceOfHour("C-1", h));
    }
  }
}

interface PricingStrategy {                       // same as before
  long priceOfHour(String court, LocalDateTime hourStart);
}

class PeakOffPeakPricing implements PricingStrategy {   // unchanged
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

// Decorator: wraps any strategy, adds a fee for lit outdoor hours.
class Floodlights implements PricingStrategy {
  private final PricingStrategy inner;
  private final Set<String> outdoor;
  private final long feeMinor;
  Floodlights(PricingStrategy inner, Set<String> outdoor, long feeMinor) {
    this.inner = inner; this.outdoor = outdoor; this.feeMinor = feeMinor;
  }
  public long priceOfHour(String court, LocalDateTime h) {
    long price = inner.priceOfHour(court, h);
    boolean dark = h.getHour() >= 18 || h.getHour() < 7;
    return outdoor.contains(court) && dark ? price + feeMinor : price;
  }
}
