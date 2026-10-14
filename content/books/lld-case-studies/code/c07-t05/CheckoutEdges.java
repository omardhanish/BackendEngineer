import java.time.LocalTime;
import java.util.*;

public class CheckoutEdges {
  public static void main(String[] args) {
    Shop shop = new Shop(54900, 3);     // the cart page showed 49900
    System.out.println(shop.checkout("k-1", 2, 99800, at("10:00")));
    System.out.println(shop.checkout("k-1", 2, 109800, at("10:01")));
    System.out.println(shop.checkout("k-1", 2, 109800, at("10:01")));
    System.out.println(shop.checkout("k-2", 1, 54900, at("10:02")));
    System.out.println(shop.pay("OR-1", false, at("10:05")));
    System.out.println(shop.pay("OR-1", true, at("10:06")));
    shop.sweep(at("10:20"));
    System.out.println(shop.pay("OR-2", true, at("10:21")));
  }
  static LocalTime at(String hhmm) { return LocalTime.parse(hhmm); }
}

class Order {
  final String id; final int qty; final LocalTime payBy;
  String status = "PENDING_PAYMENT";
  Order(String id, int qty, LocalTime payBy) {
    this.id = id; this.qty = qty; this.payBy = payBy;
  }
}

class Shop {
  private final long unitPrice;
  private int available, seq = 0;
  private final Map<String, Order> byKey = new LinkedHashMap<>();
  private final Map<String, Order> byId = new LinkedHashMap<>();
  Shop(long unitPrice, int available) {
    this.unitPrice = unitPrice; this.available = available;
  }

  String checkout(String key, int qty, long shownTotal, LocalTime now) {
    Order prior = byKey.get(key);
    if (prior != null) return "replay " + prior.id + ", available "
        + available;                           // same key: same order
    long total = unitPrice * qty;
    if (total != shownTotal) return "PRICE_CHANGED: total is now " + total;
    if (available < qty) return "OUT_OF_STOCK";
    available -= qty;                          // reserve
    Order o = new Order("OR-" + (++seq), qty, now.plusMinutes(15));
    byKey.put(key, o);
    byId.put(o.id, o);
    return o.id + " PENDING_PAYMENT until " + o.payBy
        + ", available " + available;
  }

  String pay(String orderId, boolean cardOk, LocalTime now) {
    Order o = byId.get(orderId);
    if (!o.status.equals("PENDING_PAYMENT"))
      return orderId + " refused: " + o.status + ", refund the charge";
    if (!now.isBefore(o.payBy))
      return orderId + " refused: payment window closed";
    if (!cardOk)
      return orderId + " declined, stock held until " + o.payBy;
    o.status = "PAID";
    return orderId + " PAID";
  }

  void sweep(LocalTime now) {                  // the system actor
    for (Order o : byId.values()) {
      if (o.status.equals("PENDING_PAYMENT") && !now.isBefore(o.payBy)) {
        o.status = "CANCELLED";
        available += o.qty;                    // release the reservation
        System.out.println(o.id + " expired, available " + available);
      }
    }
  }
}
