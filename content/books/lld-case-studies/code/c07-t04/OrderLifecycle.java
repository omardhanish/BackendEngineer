import java.util.*;

public class OrderLifecycle {
  public static void main(String[] args) {
    Stock mugs = new Stock(5);
    Order happy = new Order("OR-1", 2, mugs);
    happy.moveTo(OrderStatus.PAID);
    happy.moveTo(OrderStatus.SHIPPED);
    happy.moveTo(OrderStatus.CANCELLED);
    Order unpaid = new Order("OR-2", 1, mugs);
    unpaid.moveTo(OrderStatus.CANCELLED);
    unpaid.moveTo(OrderStatus.PAID);
    Order regret = new Order("OR-3", 2, mugs);
    regret.moveTo(OrderStatus.PAID);
    regret.moveTo(OrderStatus.CANCELLED);
  }
}

enum OrderStatus {
  PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED;

  private static final Map<OrderStatus, Set<OrderStatus>> NEXT =
      new EnumMap<>(OrderStatus.class);
  static {
    NEXT.put(PENDING_PAYMENT, EnumSet.of(PAID, CANCELLED));
    NEXT.put(PAID, EnumSet.of(SHIPPED, CANCELLED));
    NEXT.put(SHIPPED, EnumSet.of(DELIVERED));
    NEXT.put(DELIVERED, EnumSet.noneOf(OrderStatus.class));
    NEXT.put(CANCELLED, EnumSet.noneOf(OrderStatus.class));
  }
  boolean canMoveTo(OrderStatus to) { return NEXT.get(this).contains(to); }
}

class Stock {                     // one SKU: units on hand and reserved
  int onHand, reserved;
  Stock(int onHand) { this.onHand = onHand; }
  public String toString() {
    return "onHand=" + onHand + " reserved=" + reserved;
  }
}

class Order {
  private final String id;
  private final int qty;
  private final Stock stock;
  private OrderStatus status = OrderStatus.PENDING_PAYMENT;
  Order(String id, int qty, Stock stock) {
    this.id = id; this.qty = qty; this.stock = stock;
    stock.reserved += qty;        // placing an order reserves units
    System.out.println(id + " placed, " + stock);
  }
  void moveTo(OrderStatus to) {
    if (!status.canMoveTo(to)) {
      System.out.println(id + " refused " + status + " -> " + to);
      return;
    }
    String note = "";
    if (to == OrderStatus.PAID) {          // reservation becomes a sale
      stock.reserved -= qty; stock.onHand -= qty;
    } else if (to == OrderStatus.CANCELLED && status == OrderStatus.PAID) {
      stock.onHand += qty; note = ", refund";
    } else if (to == OrderStatus.CANCELLED) {
      stock.reserved -= qty;               // nothing was charged
    }
    System.out.println(id + " " + status + " -> " + to + ", " + stock + note);
    status = to;
  }
}
