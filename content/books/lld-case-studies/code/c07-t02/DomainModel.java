import java.util.*;

public class DomainModel {
  public static void main(String[] args) {
    Product mug = new Product("SKU-MUG", "Mug", 49900);
    Product tee = new Product("SKU-TEE", "T-shirt", 79900);
    Inventory inv = new Inventory();
    inv.restock("SKU-MUG", 5);
    inv.restock("SKU-TEE", 1);
    Cart cart = new Cart("C-1", "U-7");
    cart.add(mug, 2);
    cart.add(tee, 1);
    cart.add(mug, 1);
    System.out.println(cart.items());
    System.out.println("cart subtotal " + cart.subtotalMinor());
    Order order = Order.from("OR-1", cart);
    cart.add(mug, 1);
    System.out.println("cart after edit " + cart.subtotalMinor()
        + ", order still " + order.totalMinor() + " " + order.status());
    List<Runnable> bad = List.of(
        () -> cart.add(mug, 9),
        () -> new Product("SKU-X", "Broken", -1),
        () -> new Payment("PAY-1", "OR-1", 0, "k-1"));
    for (Runnable r : bad) {
      try { r.run(); }
      catch (IllegalArgumentException e) {
        System.out.println("rejected: " + e.getMessage());
      }
    }
    System.out.println("available SKU-TEE " + inv.available("SKU-TEE"));
  }
}

enum OrderStatus { PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED }

record Product(String sku, String name, long priceMinor) {
  Product {
    if (priceMinor < 0) throw new IllegalArgumentException("negative price");
  }
}

record CartItem(String sku, int qty, long unitPriceMinor) {
  CartItem {
    if (qty < 1 || qty > 10)
      throw new IllegalArgumentException("qty must be 1..10, got " + qty);
  }
  long lineMinor() { return unitPriceMinor * qty; }
}

class Cart {
  final String id, userId;
  private final Map<String, CartItem> items = new LinkedHashMap<>();
  Cart(String id, String userId) { this.id = id; this.userId = userId; }
  void add(Product p, int qty) {
    CartItem old = items.get(p.sku());
    int total = (old == null ? 0 : old.qty()) + qty;  // merge lines
    items.put(p.sku(), new CartItem(p.sku(), total, p.priceMinor()));
  }
  List<CartItem> items() { return List.copyOf(items.values()); }
  long subtotalMinor() {
    return items.values().stream().mapToLong(CartItem::lineMinor).sum();
  }
}

class Order {
  final String id;
  private final List<CartItem> lines;   // a frozen copy, not the cart
  private final long totalMinor;
  private OrderStatus status = OrderStatus.PENDING_PAYMENT;
  private Order(String id, List<CartItem> lines, long totalMinor) {
    this.id = id; this.lines = lines; this.totalMinor = totalMinor;
  }
  static Order from(String id, Cart cart) {
    return new Order(id, cart.items(), cart.subtotalMinor());
  }
  long totalMinor() { return totalMinor; }
  OrderStatus status() { return status; }
}

class Inventory {
  private final Map<String, Integer> onHand = new TreeMap<>();
  private final Map<String, Integer> reserved = new TreeMap<>();
  void restock(String sku, int qty) { onHand.merge(sku, qty, Integer::sum); }
  int available(String sku) {
    return onHand.getOrDefault(sku, 0) - reserved.getOrDefault(sku, 0);
  }
}

record Payment(String id, String orderId, long amountMinor,
    String idempotencyKey) {
  Payment {
    if (amountMinor <= 0)
      throw new IllegalArgumentException("payment must be positive");
  }
}
