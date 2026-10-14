import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class BrokenKey {
    public static void main(String[] args) {
        var a = new Sku("TEA", 1);
        var b = new Sku("TEA", 1);
        System.out.println("equals: " + a.equals(b));

        Set<Sku> seen = new HashSet<>();
        seen.add(a);
        System.out.println("contains copy: " + seen.contains(b));
        seen.add(b);
        System.out.println("set size: " + seen.size());

        Map<Sku, Integer> stock = new HashMap<>();
        stock.put(a, 10);
        System.out.println("stock of copy: " + stock.get(b));
    }
}

// equals is overridden, hashCode is not: the contract is broken.
class Sku {
    private final String code;
    private final int size;

    Sku(String code, int size) {
        this.code = code;
        this.size = size;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Sku other)) return false;
        return size == other.size && code.equals(other.code);
    }
}
