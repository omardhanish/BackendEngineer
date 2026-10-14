import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class CohesiveCart {
    public static void main(String[] args) {
        Cart cart = new Cart();
        cart.add(new Item("Headphones", 4000));
        cart.add(new Item("Sticker", 500));
        Promo promo = new TenPercentOver(1000);
        System.out.println("Total before promo: " + cart.totalCents());
        System.out.println("Promo discount: " + promo.discountCents(cart));
        System.out.println("Total after promo: " + cart.totalCents());
        System.out.println("Items left: " + cart.items().size());
    }
}

record Item(String name, long priceCents) {
    Item {
        Objects.requireNonNull(name, "name");
        if (priceCents < 0) throw new IllegalArgumentException("price < 0");
    }
}

// Cohesive: every method works on the cart's own items.
final class Cart {
    private final List<Item> items = new ArrayList<>();

    void add(Item item) { items.add(Objects.requireNonNull(item)); }

    List<Item> items() { return List.copyOf(items); }

    long totalCents() { return totalOfItemsAtLeast(0); }

    long totalOfItemsAtLeast(long minCents) {
        return items.stream().mapToLong(Item::priceCents)
                .filter(p -> p >= minCents).sum();
    }
}

// Narrow contract: a promo needs one question answered, nothing more.
interface Promo {
    long discountCents(Cart cart);
}

record TenPercentOver(long minCents) implements Promo {
    public long discountCents(Cart cart) {
        return cart.totalOfItemsAtLeast(minCents) / 10;
    }
}
