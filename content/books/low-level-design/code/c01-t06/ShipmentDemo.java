import java.util.ArrayList;
import java.util.List;

public class ShipmentDemo {
    public static void main(String[] args) {
        Shipment s = new Shipment("S-1", new FlatRate(5));
        s.add(new Parcel("books", 2.0));
        s.add(new Parcel("lamp", 3.5));
        System.out.println(s.id() + " costs " + s.cost());
        try {
            s.add(new Parcel("ghost", 0));
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        System.out.println("parcels " + s.parcels().size());
    }
}

record Parcel(String label, double kg) {  // immutable data, checked once
    Parcel {
        if (!(kg > 0)) throw new IllegalArgumentException("kg must be > 0");
    }
}

interface RateCard { double price(double kg); } // a role, not a thing

record FlatRate(double perKg) implements RateCard {
    public double price(double kg) { return kg * perKg; }
}

class Shipment {
    private final String id;
    private final RateCard rates;
    private final List<Parcel> parcels = new ArrayList<>();

    Shipment(String id, RateCard rates) { this.id = id; this.rates = rates; }

    String id() { return id; }
    void add(Parcel p) { parcels.add(p); } // behaviour, not a setter
    List<Parcel> parcels() { return List.copyOf(parcels); }

    double cost() {
        return parcels.stream().mapToDouble(p -> rates.price(p.kg())).sum();
    }
}
