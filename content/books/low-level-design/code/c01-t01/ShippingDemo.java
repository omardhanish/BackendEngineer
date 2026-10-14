import java.util.List;
import java.util.Objects;

public class ShippingDemo {
    public static void main(String[] args) {
        var parcel = new Parcel(2);
        List<ShippingMethod> options = List.of(
                new FlatPlusWeight("Standard", 400, 150, 4),
                new FlatPlusWeight("Express", 900, 250, 1),
                new SameDay(1500));
        for (ShippingMethod m : options) {
            System.out.println(m.name() + ": " + m.feeCents(parcel)
                    + " cents, " + m.days() + " day(s)");
        }
        try {
            new Parcel(-5);
        } catch (IllegalArgumentException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
    }
}

// A value object: a parcel can never hold a nonsense weight.
record Parcel(int weightKg) {
    Parcel {
        if (weightKg <= 0)
            throw new IllegalArgumentException("weight <= 0: " + weightKg);
    }
}

// The contract: fee and speed always travel together.
interface ShippingMethod {
    String name();
    long feeCents(Parcel parcel);
    int days();
}

// Base price plus a price per kilogram.
record FlatPlusWeight(String name, long baseCents, long perKgCents, int days)
        implements ShippingMethod {
    FlatPlusWeight {
        Objects.requireNonNull(name, "name");
        if (baseCents < 0 || perKgCents < 0 || days < 1)
            throw new IllegalArgumentException("bad tariff for " + name);
    }
    public long feeCents(Parcel parcel) {
        return baseCents + perKgCents * parcel.weightKg();
    }
}

// A new option is a new class; no existing class was edited to add it.
record SameDay(long priceCents) implements ShippingMethod {
    SameDay {
        if (priceCents < 0) throw new IllegalArgumentException("price < 0");
    }
    public String name() { return "Same day"; }
    public long feeCents(Parcel parcel) { return priceCents; }
    public int days() { return 1; }
}
