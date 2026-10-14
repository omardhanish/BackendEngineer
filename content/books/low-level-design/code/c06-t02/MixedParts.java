public class MixedParts {
    public static void main(String[] args) {
        // A UK shop, wired by hand from three separate settings.
        // One setting was copied from the India config by mistake.
        Checkout uk = new Checkout(
            new UkVat(), new RupeeFormat(), new UkPostcode());
        System.out.println(uk.quote(10_000, "SW1A 1AA"));
    }
}

interface TaxPolicy { long addTax(long minor); }
interface MoneyFormat { String format(long minor); }
interface PostcodeRule { boolean valid(String code); }

final class UkVat implements TaxPolicy {
    public long addTax(long minor) { return minor * 120 / 100; }
}
final class RupeeFormat implements MoneyFormat {
    public String format(long minor) {
        return String.format("INR %d.%02d", minor / 100, minor % 100);
    }
}
final class UkPostcode implements PostcodeRule {
    public boolean valid(String code) {
        return code.matches("[A-Z]{1,2}\\d[A-Z\\d]? \\d[A-Z]{2}");
    }
}

// Three independent parts: nothing stops a mismatched set.
final class Checkout {
    private final TaxPolicy tax;
    private final MoneyFormat money;
    private final PostcodeRule postcode;
    Checkout(TaxPolicy tax, MoneyFormat money, PostcodeRule postcode) {
        this.tax = tax;
        this.money = money;
        this.postcode = postcode;
    }
    String quote(long minor, String code) {
        if (!postcode.valid(code)) return "bad postcode " + code;
        return "total " + money.format(tax.addTax(minor));
    }
}
