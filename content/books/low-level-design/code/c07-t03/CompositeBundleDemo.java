import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class CompositeBundleDemo {
    public static void main(String[] args) {
        Bundle deskSet = new Bundle("Desk set", 5)
            .add(new Product("Desk", 20_000)).add(new Product("Chair", 15_000));
        Bundle kit = new Bundle("Office kit", 10)
            .add(deskSet).add(new Product("Monitor", 18_000));
        Bundle team = new Bundle("Team pack", 0).add(kit).add(kit);
        team.print("");
        try {
            deskSet.add(team);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}
// Component: callers treat one product and a whole tree the same way.
interface CatalogItem {
    String name();
    long pricePence();
    void print(String indent);
    default boolean contains(CatalogItem other) { return this == other; }
}
// Leaf: no children, answers from its own data.
record Product(String name, long pricePence) implements CatalogItem {
    Product {
        Objects.requireNonNull(name, "name");
        if (pricePence < 0) throw new IllegalArgumentException("price < 0");
    }
    public void print(String indent) {
        System.out.println(indent + name + " " + pricePence);
    }
}
// Composite: holds components and delegates to them.
final class Bundle implements CatalogItem {
    private final String name;
    private final int discountPct;
    private final List<CatalogItem> children = new ArrayList<>();
    Bundle(String name, int discountPct) {
        this.name = Objects.requireNonNull(name, "name");
        if (discountPct < 0 || discountPct > 100)
            throw new IllegalArgumentException("discount must be 0..100");
        this.discountPct = discountPct;
    }
    Bundle add(CatalogItem item) {
        if (Objects.requireNonNull(item, "item").contains(this))
            throw new IllegalArgumentException(name + " would contain itself");
        children.add(item);
        return this;
    }
    public String name() { return name; }
    public long pricePence() {
        long sum = 0;
        for (CatalogItem c : children) sum += c.pricePence(); // recursion
        return sum * (100 - discountPct) / 100;
    }
    public boolean contains(CatalogItem other) {
        if (this == other) return true;
        for (CatalogItem c : children) if (c.contains(other)) return true;
        return false;
    }
    public void print(String indent) {
        System.out.println(indent + name + " -" + discountPct + "% "
            + pricePence());
        for (CatalogItem c : children) c.print(indent + "  ");
    }
}
