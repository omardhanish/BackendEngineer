import java.util.*;

public class CabMatchingDemo {
    public static void main(String[] args) {
        DriverRegistry registry = new DriverRegistry(List.of(
            new Driver("D1", VehicleType.BIKE, new Location(0.5, 0.5)),
            new Driver("D2", VehicleType.SEDAN, new Location(9.0, 4.0)),
            new Driver("D3", VehicleType.SEDAN, new Location(1.0, 1.0)),
            new Driver("D4", VehicleType.SEDAN, new Location(2.0, 2.5))));
        RideService rides =
            new RideService(registry, new NearestDriverMatcher(5.0));
        Location pickup = new Location(0, 0);
        for (String rider : List.of("A", "B", "C")) {
            var req = new RideRequest(rider, pickup, VehicleType.SEDAN);
            System.out.println(rider + ": " + rides.book(req));
        }
    }
}
record Location(double x, double y) {
    double km(Location o) { return Math.hypot(x - o.x, y - o.y); }
}
enum VehicleType { BIKE, SEDAN, SUV }
record Driver(String id, VehicleType type, Location location) {}
record RideRequest(String riderId, Location pickup, VehicleType type) {}

interface DriverMatcher { // best candidate first
    List<Driver> rank(RideRequest req, List<Driver> free);
}
final class NearestDriverMatcher implements DriverMatcher {
    private final double maxKm;
    NearestDriverMatcher(double maxKm) {
        if (maxKm <= 0) throw new IllegalArgumentException("maxKm must be > 0");
        this.maxKm = maxKm;
    }
    @Override public List<Driver> rank(RideRequest req, List<Driver> free) {
        Comparator<Driver> near =
            Comparator.comparingDouble(d -> d.location().km(req.pickup()));
        return free.stream()
            .filter(d -> d.type() == req.type())
            .filter(d -> d.location().km(req.pickup()) <= maxKm)
            .sorted(near.thenComparing(Driver::id))
            .toList();
    }
}
final class DriverRegistry {
    private final Map<String, Driver> free = new LinkedHashMap<>();
    DriverRegistry(List<Driver> all) { all.forEach(d -> free.put(d.id(), d)); }
    synchronized List<Driver> freeDrivers() {
        return List.copyOf(free.values());
    }
    synchronized boolean tryReserve(String id) { // atomic check-and-take
        return free.remove(id) != null;
    }
}
final class RideService {
    private final DriverRegistry registry;
    private final DriverMatcher matcher;
    RideService(DriverRegistry registry, DriverMatcher matcher) {
        this.registry = Objects.requireNonNull(registry, "registry");
        this.matcher = Objects.requireNonNull(matcher, "matcher");
    }
    String book(RideRequest req) {
        for (Driver d : matcher.rank(req, registry.freeDrivers())) {
            if (registry.tryReserve(d.id())) {
                return String.format(Locale.ROOT, "%s, %.1f km away",
                    d.id(), d.location().km(req.pickup()));
            }
        }
        return "no " + req.type() + " within range";
    }
}
