import java.util.List;

public class InstanceofTotals {
    public static void main(String[] args) {
        Bundle deskSet = new Bundle("Desk set", 5, List.of(
            new Product("Desk", 20_000), new Product("Chair", 15_000)));
        Bundle kit = new Bundle("Office kit", 10, List.of(
            deskSet, new Product("Monitor", 18_000)));
        Bundle team = new Bundle("Team pack", 0, List.of(kit, kit));
        System.out.println("desk set:  " + Pricing.total(deskSet));
        System.out.println("kit:       " + Pricing.total(kit));
        System.out.println("team pack: " + Pricing.total(team));
    }
}

record Product(String name, long pence) {}
// No shared type: a bundle holds "anything".
record Bundle(String name, int discountPct, List<Object> items) {}

final class Pricing {
    // The caller must know every type and how deep the nesting goes.
    static long total(Bundle bundle) {
        long sum = 0;
        for (Object item : bundle.items()) {
            if (item instanceof Product) {
                sum += ((Product) item).pence();
            } else if (item instanceof Bundle) {
                Bundle inner = (Bundle) item;   // one level, no discount
                for (Object o : inner.items()) {
                    if (o instanceof Product) sum += ((Product) o).pence();
                    // a bundle inside a bundle inside a bundle: dropped
                }
            }
        }
        return sum * (100 - bundle.discountPct()) / 100;
    }
}
