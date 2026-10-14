import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

public class VendingSkeleton {
    public static void main(String[] args) {
        // The use cases agreed in minutes 0-5, replayed in order.
        var machine = new VendingMachine();
        machine.restock(Slot.A1, new Product("Water", 120), 1);
        machine.insert(100);
        System.out.println(machine.select(Slot.A1));
        machine.insert(50);
        System.out.println(machine.select(Slot.A1));
        machine.insert(200);
        System.out.println(machine.select(Slot.A1));
        System.out.println("Refund: " + machine.refund());
    }
}

enum Slot { A1, A2, B1 }
enum Status { VENDED, NEED_MORE, SOLD_OUT }
// cents = change for VENDED, shortfall for NEED_MORE, 0 otherwise.
record Outcome(Status status, int cents) {}

record Product(String name, int priceCents) {
    Product {
        Objects.requireNonNull(name, "name");
        if (priceCents <= 0) throw new IllegalArgumentException("price <= 0");
    }
}

class VendingMachine {
    private final Map<Slot, Product> products = new EnumMap<>(Slot.class);
    private final Map<Slot, Integer> stock = new EnumMap<>(Slot.class);
    private int creditCents;

    void restock(Slot slot, Product product, int count) {
        Objects.requireNonNull(product, "product");
        if (count <= 0) throw new IllegalArgumentException("count <= 0");
        products.put(Objects.requireNonNull(slot), product);
        stock.merge(slot, count, Integer::sum);
    }

    void insert(int cents) { creditCents += cents; }

    Outcome select(Slot slot) {
        Product p = products.get(slot);
        if (p == null || stock.get(slot) == 0) {
            return new Outcome(Status.SOLD_OUT, 0);
        }
        if (creditCents < p.priceCents()) {
            return new Outcome(Status.NEED_MORE, p.priceCents() - creditCents);
        }
        stock.merge(slot, -1, Integer::sum);
        int change = creditCents - p.priceCents();
        creditCents = 0;
        return new Outcome(Status.VENDED, change);
    }

    int refund() { int back = creditCents; creditCents = 0; return back; }
}
