import java.util.List;

public class RolesDemo {
    public static void main(String[] args) {
        var book = new Book("Clean Code", 3000, 400);
        var ebook = new Ebook("Refactoring", 2000);

        // One class plays two roles; each caller sees only the one it needs.
        List<Priced> cart = List.of(book, ebook);
        for (Priced p : cart)
            System.out.println(p.label() + " -> " + p.grossCents());

        Shippable parcel = book;
        System.out.println("ship " + parcel.weightGrams() + "g");
        System.out.println(Priced.cheapest(cart).label());
    }
}

interface Priced {
    long netCents();
    String label();
    // A default method: shared behaviour, no state, can be overridden.
    default long grossCents() { return netCents() * 120 / 100; }
    static Priced cheapest(List<Priced> items) {
        if (items.isEmpty()) throw new IllegalArgumentException("empty");
        Priced best = items.get(0);
        for (Priced p : items)
            if (p.netCents() < best.netCents()) best = p;
        return best;
    }
}

interface Shippable {
    int weightGrams();
}

record Book(String label, long netCents, int weightGrams)
        implements Priced, Shippable {
    Book {
        if (netCents < 0 || weightGrams <= 0)
            throw new IllegalArgumentException("bad book " + label);
    }
}

record Ebook(String label, long netCents) implements Priced {
    // Digital goods here carry a different tax rate.
    @Override public long grossCents() { return netCents * 105 / 100; }
}
