import java.util.List;

public class ShippingDemo {
    public static void main(String[] args) {
        Shipping shipping = new Shipping(List.of(
                new StandardRule(), new ExpressRule(), new LockerRule()));
        System.out.println(shipping.quote(new Parcel(2.5, true)));
        System.out.println(shipping.quote(new Parcel(7.0, false)));
    }
}

record Parcel(double kg, boolean toLocker) {}
interface ShippingRule {                   // the one extension point
    String name();
    default boolean appliesTo(Parcel p) { return true; }
    long cents(Parcel p);
}

class Shipping {                           // closed: no edit per new rule
    private final List<ShippingRule> rules;
    Shipping(List<ShippingRule> rules) { this.rules = List.copyOf(rules); }
    List<String> quote(Parcel p) {
        return rules.stream()
                .filter(r -> r.appliesTo(p))
                .map(r -> r.name() + "=" + r.cents(p))
                .toList();
    }
}

class StandardRule implements ShippingRule {
    public String name() { return "standard"; }
    public long cents(Parcel p) { return 300 + Math.round(p.kg() * 100); }
}

class ExpressRule implements ShippingRule {
    public String name() { return "express"; }
    public boolean appliesTo(Parcel p) { return p.kg() <= 5; }
    public long cents(Parcel p) { return 900; }
}

class LockerRule implements ShippingRule { // added later: one new class
    public String name() { return "locker"; }
    public boolean appliesTo(Parcel p) { return p.toLocker(); }
    public long cents(Parcel p) { return 250; }
}
