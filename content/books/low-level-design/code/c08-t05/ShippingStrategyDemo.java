import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

public class ShippingStrategyDemo {
    public static void main(String[] args) {
        Map<String, ShippingRate> rates = new TreeMap<>();
        rates.put("standard", new WeightRate(500, 150));
        rates.put("express", new WeightRate(1500, 400));
        rates.put("pickup", kg -> 0); // a lambda is a strategy too
        Checkout checkout = new Checkout(rates);
        for (String method : rates.keySet()) {
            System.out.println(method + " 2kg: "
                + checkout.shipping(method, 2.0));
        }
        try {
            checkout.shipping("Express", 2.0);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

@FunctionalInterface
interface ShippingRate {
    long centsFor(double kg);
}

record WeightRate(long baseCents, long centsPerKg) implements ShippingRate {
    WeightRate {
        if (baseCents < 0 || centsPerKg < 0)
            throw new IllegalArgumentException("rate must be >= 0");
    }
    @Override public long centsFor(double kg) {
        return baseCents + Math.round(kg * centsPerKg);
    }
}

// The context: it knows WHEN to price, never HOW.
final class Checkout {
    private final Map<String, ShippingRate> rates;

    Checkout(Map<String, ShippingRate> rates) {
        this.rates = Map.copyOf(Objects.requireNonNull(rates, "rates"));
    }

    long shipping(String method, double kg) {
        if (kg <= 0) throw new IllegalArgumentException("kg must be > 0");
        ShippingRate rate = rates.get(method);
        if (rate == null)
            throw new IllegalArgumentException("unknown method: " + method);
        return rate.centsFor(kg);
    }
}
