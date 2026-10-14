import java.util.ArrayList;
import java.util.List;

public class LeakyCart {
    public static void main(String[] args) {
        Cart cart = new Cart();
        cart.add(new Item("Headphones", 4000));
        cart.add(new Item("Sticker", 500));
        System.out.println("Total before promo: " + cart.totalCents());
        long off = new PromoEngine().discountCents(cart);
        System.out.println("Promo discount: " + off);
        System.out.println("Total after promo: " + cart.totalCents());
        System.out.println("Items left: " + cart.items().size());
    }
}

record Item(String name, long priceCents) {}

class Cart {
    private final List<Item> items = new ArrayList<>();

    void add(Item item) { items.add(item); }

    // Hands out the live internal list: anyone can now edit the cart.
    List<Item> items() { return items; }

    long totalCents() {
        return items.stream().mapToLong(Item::priceCents).sum();
    }
}

// Knows how Cart stores items, and changes them to do its own maths.
class PromoEngine {
    long discountCents(Cart cart) {
        List<Item> eligible = cart.items();
        eligible.removeIf(i -> i.priceCents() < 1000);
        long sum = 0;
        for (Item i : eligible) sum += i.priceCents();
        return sum / 10;
    }
}
