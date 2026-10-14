import java.util.Objects;

public class RegionKitDemo {
    public static void main(String[] args) {
        Checkout uk = new Checkout(kitFor("UK"));
        Checkout in = new Checkout(kitFor("IN"));
        System.out.println(uk.quote(10_000, "SW1A 1AA"));
        System.out.println(in.quote(10_000, "560001"));
        System.out.println(in.quote(10_000, "SW1A 1AA"));
        try { kitFor("FR"); }
        catch (IllegalArgumentException e) {
            System.out.println("error: " + e.getMessage());
        }
    }
    // The single place that knows the concrete families.
    static RegionKit kitFor(String region) {
        return switch (region) {
            case "UK" -> new UkKit();
            case "IN" -> new IndiaKit();
            default -> throw new IllegalArgumentException(
                "no kit for region " + region);
        };
    }
}
interface TaxPolicy { long addTax(long minor); }
interface MoneyFormat { String format(long minor); }
interface PostcodeRule { boolean valid(String code); }

// Abstract factory: one create method per product in the family.
interface RegionKit {
    TaxPolicy tax();
    MoneyFormat money();
    PostcodeRule postcode();
}
final class Money {           // formatting helper, not part of the factory
    static String fmt(String currency, long minor) {
        return String.format("%s %d.%02d", currency, minor / 100, minor % 100);
    }
}
// Concrete factories. Rates and patterns are simplified samples.
final class UkKit implements RegionKit {
    public TaxPolicy tax() { return m -> m * 120 / 100; }
    public MoneyFormat money() { return m -> Money.fmt("GBP", m); }
    public PostcodeRule postcode() {
        return c -> c.matches("[A-Z]{1,2}\\d[A-Z\\d]? \\d[A-Z]{2}");
    }
}
final class IndiaKit implements RegionKit {
    public TaxPolicy tax() { return m -> m * 118 / 100; }
    public MoneyFormat money() { return m -> Money.fmt("INR", m); }
    public PostcodeRule postcode() { return c -> c.matches("[1-9]\\d{5}"); }
}
// The client sees only interfaces, so it cannot mix families.
final class Checkout {
    private final TaxPolicy tax;
    private final MoneyFormat money;
    private final PostcodeRule postcode;
    Checkout(RegionKit kit) {
        Objects.requireNonNull(kit, "kit");
        this.tax = kit.tax();
        this.money = kit.money();
        this.postcode = kit.postcode();
    }
    String quote(long minor, String code) {
        if (!postcode.valid(code)) return "bad postcode " + code;
        return "total " + money.format(tax.addTax(minor));
    }
}
