import java.util.List;
import java.util.Locale;

public class CabMatchingNaive {
    public static void main(String[] args) {
        List<Driver> drivers = List.of(
            new Driver("D1", VehicleType.BIKE, new Location(0.5, 0.5)),
            new Driver("D2", VehicleType.SEDAN, new Location(9.0, 4.0)),
            new Driver("D3", VehicleType.SEDAN, new Location(1.0, 1.0)));
        Location pickup = new Location(0, 0);
        Driver a = firstFree(drivers);
        System.out.println("A wants SEDAN, gets " + a.describe(pickup));
        Driver b = firstFree(drivers);
        System.out.println("B wants SEDAN, gets " + b.describe(pickup));
        Driver c = firstSedan(drivers);
        System.out.println("C wants SEDAN, gets " + c.describe(pickup));
    }

    // Ignores vehicle type and never marks the driver as taken.
    static Driver firstFree(List<Driver> drivers) {
        for (Driver d : drivers) if (d.available) return d;
        throw new IllegalStateException("no driver");
    }

    // Checks the type, but list order decides, not distance.
    static Driver firstSedan(List<Driver> drivers) {
        for (Driver d : drivers) {
            if (d.available && d.type == VehicleType.SEDAN) return d;
        }
        throw new IllegalStateException("no sedan");
    }
}

record Location(double x, double y) {
    double distanceTo(Location o) { return Math.hypot(x - o.x, y - o.y); }
}

enum VehicleType { BIKE, SEDAN, SUV }

class Driver {
    final String id;
    final VehicleType type;
    Location location;
    boolean available = true; // mutable flag nobody guards

    Driver(String id, VehicleType type, Location location) {
        this.id = id;
        this.type = type;
        this.location = location;
    }

    String describe(Location from) {
        return String.format(Locale.ROOT, "%s (%s, %.1f km)",
            id, type, location.distanceTo(from));
    }
}
