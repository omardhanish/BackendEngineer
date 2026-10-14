import java.util.List;

public class FareDemo {
    public static void main(String[] args) {
        List<Ride> rides = List.of(
                new BikeRide(5), new CarRide(5), new SharedRide(5, 3));
        for (Ride r : rides)
            System.out.println(r.getClass().getSimpleName()
                    + " -> " + r.fareCents());
        System.out.println("total " + totalFare(rides));
    }

    // Caller never asks "which kind?"; each ride answers for itself.
    static long totalFare(List<Ride> rides) {
        long sum = 0;
        for (Ride r : rides) sum += r.fareCents();
        return sum;
    }
}

abstract class Ride {
    private final int km;
    Ride(int km) {
        if (km <= 0) throw new IllegalArgumentException("km must be > 0");
        this.km = km;
    }
    protected int km() { return km; }
    abstract long fareCents();
}

final class BikeRide extends Ride {
    BikeRide(int km) { super(km); }
    @Override long fareCents() { return 50L * km(); }
}

final class CarRide extends Ride {
    CarRide(int km) { super(km); }
    @Override long fareCents() { return 200 + 120L * km(); }
}

// Added later: no existing class or caller had to change.
final class SharedRide extends Ride {
    private final int riders;
    SharedRide(int km, int riders) {
        super(km);
        if (riders < 1) throw new IllegalArgumentException("riders < 1");
        this.riders = riders;
    }
    @Override long fareCents() { return (200 + 120L * km()) / riders; }
}
