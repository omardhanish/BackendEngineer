import java.util.*;

public class CoreCheckout {
  public static void main(String[] args) {
    Map<String, Long> catalog = Map.of("SKU-MUG", 49900L, "SKU-TEE", 79900L);
    Inventory inv = new Inventory(Map.of("SKU-MUG", 5, "SKU-TEE", 1));
    CheckoutService svc = new CheckoutService(catalog, inv,
        List.of(new PercentOffOver(200000, 10)), new FakeGateway());
    Order a = svc.checkout("U-7", List.of(new CartItem("SKU-MUG", 3),
        new CartItem("SKU-TEE", 1)), "tok-ok");
    System.out.println(a.id() + " subtotal " + a.subtotalMinor()
        + " discount " + a.discountMinor() + " total " + a.totalMinor());
    tryCheckout(svc, "U-9", List.of(new CartItem("SKU-TEE", 1)), "tok-ok");
    tryCheckout(svc, "U-8", List.of(new CartItem("SKU-MUG", 2)), "tok-bad");
    System.out.println("mugs available " + inv.available("SKU-MUG"));
  }

  static void tryCheckout(CheckoutService svc, String user,
      List<CartItem> items, String token) {
    try { svc.checkout(user, items, token); }
    catch (IllegalStateException e) {
      System.out.println(user + ": " + e.getMessage());
    }
  }
}

record CartItem(String sku, int qty) {}
record Line(String sku, int qty, long unitPriceMinor) {
  long amountMinor() { return unitPriceMinor * qty; }
}
record Order(String id, String userId, List<Line> lines, long subtotalMinor,
    long discountMinor, long totalMinor) {}
interface PricingRule { long discount(List<Line> lines, long runningMinor); }
interface PaymentGateway { boolean charge(long amountMinor, String token); }

class PercentOffOver implements PricingRule {
  private final long thresholdMinor; private final int percent;
  PercentOffOver(long thresholdMinor, int percent) {
    this.thresholdMinor = thresholdMinor; this.percent = percent;
  }
  public long discount(List<Line> lines, long running) {
    return running >= thresholdMinor ? running * percent / 100 : 0;
  }
}

class FakeGateway implements PaymentGateway {
  public boolean charge(long amountMinor, String token) {
    return token.equals("tok-ok");
  }
}

class Inventory {
  private final Map<String, Integer> available;
  Inventory(Map<String, Integer> stock) { available = new TreeMap<>(stock); }
  synchronized String reserveAll(List<Line> lines) {  // null = success
    for (Line l : lines)
      if (available.getOrDefault(l.sku(), 0) < l.qty()) return l.sku();
    for (Line l : lines) available.merge(l.sku(), -l.qty(), Integer::sum);
    return null;
  }
  synchronized void releaseAll(List<Line> lines) {
    for (Line l : lines) available.merge(l.sku(), l.qty(), Integer::sum);
  }
  synchronized int available(String sku) { return available.get(sku); }
}

class CheckoutService {                       // the facade
  private final Map<String, Long> catalog;
  private final Inventory inventory;
  private final List<PricingRule> rules;
  private final PaymentGateway gateway;
  private int orderSeq = 0;
  CheckoutService(Map<String, Long> catalog, Inventory inventory,
      List<PricingRule> rules, PaymentGateway gateway) {
    this.catalog = catalog; this.inventory = inventory;
    this.rules = List.copyOf(rules); this.gateway = gateway;
  }
  Order checkout(String userId, List<CartItem> items, String payToken) {
    List<Line> lines = new ArrayList<>();
    for (CartItem i : items)                  // reprice from the catalog
      lines.add(new Line(i.sku(), i.qty(), catalog.get(i.sku())));
    long subtotal = lines.stream().mapToLong(Line::amountMinor).sum();
    long running = subtotal;
    for (PricingRule r : rules) running -= r.discount(lines, running);
    String shortSku = inventory.reserveAll(lines);
    if (shortSku != null)
      throw new IllegalStateException("OUT_OF_STOCK " + shortSku);
    if (!gateway.charge(running, payToken)) {
      inventory.releaseAll(lines);            // never keep unpaid stock
      throw new IllegalStateException("PAYMENT_DECLINED");
    }
    return new Order("OR-" + (++orderSeq), userId, List.copyOf(lines),
        subtotal, subtotal - running, running);
  }
}
