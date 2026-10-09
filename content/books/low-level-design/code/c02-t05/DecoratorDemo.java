import java.util.HashMap;
import java.util.Map;

public class DecoratorDemo {
    public static void main(String[] args) {
        PriceLookup lookup =
            new Logging(new Caching(new Catalog()));
        lookup.price("tea");
        lookup.price("tea");
    }
}

interface PriceLookup {
    double price(String sku);
}

class Catalog implements PriceLookup {
    public double price(String sku) {
        System.out.println("  catalog reads " + sku);
        return 3.75;
    }
}

class Caching implements PriceLookup {
    private final PriceLookup inner;
    private final Map<String, Double> cache = new HashMap<>();
    Caching(PriceLookup inner) { this.inner = inner; }

    public double price(String sku) {
        return cache.computeIfAbsent(sku, inner::price);
    }
}

class Logging implements PriceLookup {
    private final PriceLookup inner;

    Logging(PriceLookup inner) { this.inner = inner; }

    public double price(String sku) {
        System.out.println("ask " + sku);
        double result = inner.price(sku);
        System.out.println("got " + sku + " = " + result);
        return result;
    }
}
