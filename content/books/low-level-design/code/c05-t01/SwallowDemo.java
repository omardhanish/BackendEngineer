import java.util.Map;

public class SwallowDemo {
    public static void main(String[] args) {
        PriceLookup lookup = new PriceLookup(Map.of("tea", 250));
        System.out.println("tea    -> " + lookup.priceOrZero("tea"));
        System.out.println("coffee -> " + lookup.priceOrZero("coffee"));
        System.out.println("null   -> " + lookup.priceOrZero(null));
        System.out.println("A missing price and a bug both look free.");
    }
}

class PriceLookup {
    private final Map<String, Integer> pricesInCents;

    PriceLookup(Map<String, Integer> pricesInCents) {
        this.pricesInCents = Map.copyOf(pricesInCents);
    }

    // Declares the broadest checked type: says nothing useful.
    int price(String sku) throws Exception {
        Integer cents = pricesInCents.get(sku.trim());
        if (cents == null) {
            throw new Exception("no price for " + sku);
        }
        return cents;
    }

    // Forced to catch, the caller swallows everything as 0.
    int priceOrZero(String sku) {
        try {
            return price(sku);
        } catch (Exception e) {
            return 0;
        }
    }
}
