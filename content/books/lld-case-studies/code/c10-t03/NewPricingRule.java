import java.util.*;

public class NewPricingRule {
  public static void main(String[] args) {
    FareClass saver = new FareClass("Y-SAVER", 450000);
    PricingStrategy fixed = new FixedFarePricing();
    TreeMap<Integer, Integer> tiers = new TreeMap<>();
    tiers.put(2, 50);   // 2 or fewer seats left: +50%
    tiers.put(5, 20);   // 3 to 5 seats left: +20%
    PricingStrategy scarce = new ScarcityPricing(tiers);
    for (int left : List.of(9, 5, 3, 2, 1)) {
      System.out.println("left " + left + ": fixed "
          + fixed.perPassenger(saver, left) + ", scarcity "
          + scarce.perPassenger(saver, left));
    }
  }
}

record FareClass(String code, long priceMinor) {}
interface PricingStrategy { long perPassenger(FareClass fare, int left); }

class FixedFarePricing implements PricingStrategy {
  public long perPassenger(FareClass fare, int left) {
    return fare.priceMinor();
  }
}

// New class. FlightBookingService and FixedFarePricing are not edited.
class ScarcityPricing implements PricingStrategy {
  private final NavigableMap<Integer, Integer> upliftByLeft;
  ScarcityPricing(NavigableMap<Integer, Integer> tiers) {
    this.upliftByLeft = new TreeMap<>(tiers);
  }
  public long perPassenger(FareClass fare, int left) {
    Map.Entry<Integer, Integer> tier = upliftByLeft.ceilingEntry(left);
    int pct = tier == null ? 0 : tier.getValue();
    return fare.priceMinor() * (100 + pct) / 100;
  }
}
