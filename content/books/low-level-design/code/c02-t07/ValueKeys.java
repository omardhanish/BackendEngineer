import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public class ValueKeys {
    public static void main(String[] args) {
        var a = new Sku("TEA", 1);
        var b = new Sku("tea", 1); // normalised to TEA
        System.out.println("equals: " + a.equals(b)
                + ", same hash: " + (a.hashCode() == b.hashCode()));
        Set<Sku> seen = new HashSet<>(Set.of(a));
        System.out.println("contains copy: " + seen.contains(b));

        Map<SkuKey, Integer> stock = new HashMap<>();
        stock.put(new SkuKey("TEA", 1), 10);
        stock.merge(new SkuKey("TEA", 1), 5, Integer::sum);
        System.out.println("stock: " + stock.get(new SkuKey("TEA", 1))
                + " in " + stock.size() + " entry");
        System.out.println(new SkuKey("TEA", 1));
    }
}

// Hand-written value object: final, immutable, equals and hashCode agree.
final class Sku {
    private final String code;
    private final int size;

    Sku(String code, int size) {
        if (size <= 0) throw new IllegalArgumentException("size <= 0");
        this.code = Objects.requireNonNull(code, "code")
                .toUpperCase(Locale.ROOT);
        this.size = size;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Sku other)) return false;
        return size == other.size && code.equals(other.code);
    }

    @Override
    public int hashCode() {
        return Objects.hash(code, size); // the same fields as equals
    }
}

// The same contract, generated: a record compares all components.
record SkuKey(String code, int size) {
    SkuKey {
        Objects.requireNonNull(code, "code");
    }
}
