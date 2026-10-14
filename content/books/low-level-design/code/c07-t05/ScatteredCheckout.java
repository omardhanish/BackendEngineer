import java.util.HashMap;
import java.util.Map;

public class ScatteredCheckout {
    public static void main(String[] args) {
        Inventory stock = new Inventory(Map.of("lamp", 3));
        Payments payments = new Payments(5_000);
        Shipping shipping = new Shipping();
        new WebController(stock, payments, shipping).buy("lamp", 2_000);
        new MobileController(stock, payments, shipping).buy("lamp", 9_000);
        System.out.println("lamps left: " + stock.left("lamp")
            + " (expected 2)");
    }
}
final class Inventory {
    private final Map<String, Integer> units = new HashMap<>();
    Inventory(Map<String, Integer> start) { units.putAll(start); }
    void reserve(String item) { units.merge(item, -1, Integer::sum); }
    void release(String item) { units.merge(item, 1, Integer::sum); }
    int left(String item) { return units.getOrDefault(item, 0); }
}
final class Payments {
    private final long limitCents;
    Payments(long limitCents) { this.limitCents = limitCents; }
    String charge(long cents) {
        if (cents > limitCents) throw new IllegalStateException("declined");
        return "ch-" + cents;
    }
}
final class Shipping {
    String book(String item) { return "parcel for " + item; }
}
final class WebController {   // knows all three classes and their order
    private final Inventory s; private final Payments p;
    private final Shipping sh;
    WebController(Inventory s, Payments p, Shipping sh) {
        this.s = s; this.p = p; this.sh = sh;
    }
    void buy(String item, long cents) {
        s.reserve(item);
        try { p.charge(cents); }
        catch (IllegalStateException e) { s.release(item); return; }
        System.out.println("web: " + sh.book(item));
    }
}
final class MobileController {   // a copy of the steps, one step missing
    private final Inventory s; private final Payments p;
    private final Shipping sh;
    MobileController(Inventory s, Payments p, Shipping sh) {
        this.s = s; this.p = p; this.sh = sh;
    }
    void buy(String item, long cents) {
        s.reserve(item);
        try { p.charge(cents); }
        catch (IllegalStateException e) {
            System.out.println("mobile: payment " + e.getMessage());
            return;   // forgot s.release(item)
        }
        System.out.println("mobile: " + sh.book(item));
    }
}
