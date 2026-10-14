public class VendorLeak {
    public static void main(String[] args) {
        FastShipClient vendor = new FastShipClient();
        Checkout checkout = new Checkout(vendor);
        Returns returns = new Returns(vendor);
        System.out.println("checkout GB " + checkout.shippingPence(2500, "GB"));
        System.out.println("checkout US " + checkout.shippingPence(500, "US"));
        System.out.println("returns  GB " + returns.labelPrice(2500, "GB"));
        System.out.println("returns  IE " + returns.labelPrice(800, "IE"));
    }
}

// Vendor SDK we cannot edit: kilograms, 3-letter codes, prices as text.
final class FastShipClient {
    String getRate(double weightKg, String countryIso3) {
        if (!countryIso3.equals("GBR") && !countryIso3.equals("IRL")) {
            return "ERR unsupported " + countryIso3;
        }
        long pence = 300 + Math.round(weightKg * 120);
        return String.format("GBP %d.%02d", pence / 100, pence % 100);
    }
}

// Checkout translates everything by hand...
final class Checkout {
    private final FastShipClient vendor;
    Checkout(FastShipClient vendor) { this.vendor = vendor; }
    long shippingPence(int grams, String iso2) {
        String iso3 = iso2.equals("GB") ? "GBR" : "IRL";
        String text = vendor.getRate(grams / 1000.0, iso3);
        return Math.round(Double.parseDouble(text.substring(4)) * 100);
    }
}

// ...and Returns copied the call in a hurry, minus the translations.
final class Returns {
    private final FastShipClient vendor;
    Returns(FastShipClient vendor) { this.vendor = vendor; }
    String labelPrice(int grams, String iso2) {
        String iso3 = iso2.equals("GB") ? "GBR" : iso2;
        return vendor.getRate(grams, iso3);
    }
}
