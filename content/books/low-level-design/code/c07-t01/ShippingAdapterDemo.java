import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;

public class ShippingAdapterDemo {
    public static void main(String[] args) {
        RateProvider rates = new FastShipAdapter(new FastShipClient());
        for (Parcel p : new Parcel[] {
                new Parcel(2_500, "GB"), new Parcel(800, "IE"),
                new Parcel(500, "US") }) {
            try {
                System.out.println(p + " -> " + rates.quotePence(p));
            } catch (UnsupportedDestinationException e) {
                System.out.println(p + " -> refused: " + e.getMessage());
            }
        }
    }
}

record Parcel(int grams, String country) {
    Parcel {
        if (grams <= 0) throw new IllegalArgumentException("grams must be > 0");
        Objects.requireNonNull(country, "country");
    }
}
// Target: the interface our own code is written against.
interface RateProvider { long quotePence(Parcel parcel); }

final class UnsupportedDestinationException extends RuntimeException {
    UnsupportedDestinationException(String message) { super(message); }
}
// Adaptee: the vendor SDK, unchanged.
final class FastShipClient {
    String getRate(double weightKg, String countryIso3) {
        if (!countryIso3.equals("GBR") && !countryIso3.equals("IRL")) {
            return "ERR unsupported " + countryIso3;
        }
        long pence = 300 + Math.round(weightKg * 120);
        return String.format("GBP %d.%02d", pence / 100, pence % 100);
    }
}

// Adapter: implements the target, wraps the adaptee, translates both ways.
final class FastShipAdapter implements RateProvider {
    private static final Map<String, String> ISO3 =
        Map.of("GB", "GBR", "IE", "IRL", "US", "USA");
    private final FastShipClient client;
    FastShipAdapter(FastShipClient client) {
        this.client = Objects.requireNonNull(client, "client");
    }
    @Override public long quotePence(Parcel parcel) {
        String iso3 = ISO3.get(parcel.country());
        if (iso3 == null) throw new UnsupportedDestinationException(
            "no code for " + parcel.country());
        String reply = client.getRate(parcel.grams() / 1000.0, iso3);
        if (reply.startsWith("ERR ")) {
            throw new UnsupportedDestinationException(reply.substring(4));
        }
        // "GBP 6.00" -> 600, exact decimal arithmetic, no double rounding
        return new BigDecimal(reply.substring(4)).movePointRight(2)
            .longValueExact();
    }
}
