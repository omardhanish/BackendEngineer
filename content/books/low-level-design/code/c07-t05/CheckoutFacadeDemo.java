import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class CheckoutFacadeDemo {
    public static void main(String[] args) {
        Inventory stock = new Inventory(Map.of("lamp", 3));
        Checkout checkout =
            new Checkout(stock, new Payments(5_000), new Shipping());
        System.out.println(checkout.placeOrder("lamp", 2_000, "N1"));
        System.out.println(checkout.placeOrder("lamp", 9_000, "N1"));
        System.out.println(checkout.placeOrder("lamp", 1_000, "ZZ"));
        System.out.println("lamps left: " + stock.left("lamp"));
    }
}
record OrderResult(boolean ok, String detail) {
    @Override public String toString() {
        return (ok ? "OK " : "FAILED ") + detail;
    }
}
final class Checkout {   // the facade: one call, the right order, cleanup
    private final Inventory stock;
    private final Payments payments;
    private final Shipping shipping;
    Checkout(Inventory stock, Payments payments, Shipping shipping) {
        this.stock = Objects.requireNonNull(stock, "stock");
        this.payments = Objects.requireNonNull(payments, "payments");
        this.shipping = Objects.requireNonNull(shipping, "shipping");
    }
    OrderResult placeOrder(String item, long cents, String postcode) {
        if (cents <= 0) throw new IllegalArgumentException("cents <= 0");
        if (!stock.reserve(item)) return new OrderResult(false, "no stock");
        String chargeId;
        try { chargeId = payments.charge(cents); }
        catch (IllegalStateException e) {
            stock.release(item);
            return new OrderResult(false, "payment " + e.getMessage());
        }
        try { return new OrderResult(true, shipping.book(item, postcode)); }
        catch (IllegalArgumentException e) {
            payments.refund(chargeId);
            stock.release(item);
            return new OrderResult(false, "shipping " + e.getMessage());
        }
    }
}
final class Inventory {
    private final Map<String, Integer> units = new HashMap<>();
    Inventory(Map<String, Integer> start) { units.putAll(start); }
    boolean reserve(String item) {
        if (left(item) == 0) return false;
        units.merge(item, -1, Integer::sum);
        return true;
    }
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
    void refund(String chargeId) { System.out.println("  refund " + chargeId); }
}
final class Shipping {
    String book(String item, String postcode) {
        if (postcode.startsWith("Z"))
            throw new IllegalArgumentException("no route to " + postcode);
        return "parcel " + item + " to " + postcode;
    }
}
