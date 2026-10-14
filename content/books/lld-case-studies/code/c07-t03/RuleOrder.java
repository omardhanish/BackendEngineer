import java.util.*;

public class RuleOrder {
  public static void main(String[] args) {
    List<Line> cart = List.of(new Line("SKU-MUG", 3, 49900),
        new Line("SKU-TEE", 1, 79900));
    PricingRule tenOff = new PercentOffOver(200000, 10);
    PricingRule mugs = new BuyXPayY("SKU-MUG", 3, 2);
    System.out.println("only 10% off:      " + total(cart, List.of(tenOff)));
    System.out.println("3-for-2, then 10%: "
        + total(cart, List.of(mugs, tenOff)));
    System.out.println("10%, then 3-for-2: "
        + total(cart, List.of(tenOff, mugs)));
  }

  static long total(List<Line> lines, List<PricingRule> rules) {
    long running = lines.stream().mapToLong(Line::amountMinor).sum();
    for (PricingRule r : rules) running -= r.discount(lines, running);
    return running;
  }
}

record Line(String sku, int qty, long unitPriceMinor) {
  long amountMinor() { return unitPriceMinor * qty; }
}
interface PricingRule { long discount(List<Line> lines, long runningMinor); }

class PercentOffOver implements PricingRule {   // unchanged from before
  private final long thresholdMinor; private final int percent;
  PercentOffOver(long thresholdMinor, int percent) {
    this.thresholdMinor = thresholdMinor; this.percent = percent;
  }
  public long discount(List<Line> lines, long running) {
    return running >= thresholdMinor ? running * percent / 100 : 0;
  }
}

class BuyXPayY implements PricingRule {         // the new class
  private final String sku; private final int buy, pay;
  BuyXPayY(String sku, int buy, int pay) {
    this.sku = sku; this.buy = buy; this.pay = pay;
  }
  public long discount(List<Line> lines, long running) {
    long off = 0;
    for (Line l : lines)
      if (l.sku().equals(sku))
        off += (long) (l.qty() / buy) * (buy - pay) * l.unitPriceMinor();
    return Math.min(off, running);              // never below zero
  }
}
