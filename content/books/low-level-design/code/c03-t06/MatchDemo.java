import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

public class MatchDemo {
    public static void main(String[] args) {
        List<Driver> drivers = List.of(Driver.of("D1", 0, 6, 4.9),
                Driver.of("D2", 1, 2, 4.2), Driver.of("D3", 4, 3, 4.6));
        Location pickup = new Location(1, 1);
        DriverMatcher nearest = new NearestMatcher();
        DriverMatcher topRated = (p, ds) -> ds.stream()
                .filter(Driver::isFree)
                .max(Comparator.comparingDouble(Driver::rating));
        System.out.println("nearest: " + nearest.match(pickup, drivers));
        System.out.println("top rated: " + topRated.match(pickup, drivers));
        Driver d2 = drivers.get(1);
        System.out.println("D2: " + d2.tryAssign() + ", " + d2.tryAssign());
        System.out.println("nearest: " + nearest.match(pickup, drivers));
    }
}

record Location(int x, int y) {
    int distanceTo(Location o) { return Math.abs(x - o.x) + Math.abs(y - o.y); }
}

record Driver(String id, Location at, double rating, AtomicBoolean free) {
    static Driver of(String id, int x, int y, double rating) {
        var at = new Location(x, y);
        return new Driver(id, at, rating, new AtomicBoolean(true));
    }
    boolean isFree() { return free.get(); }
    // atomic check-and-set: two trips can never claim one driver
    boolean tryAssign() { return free.compareAndSet(true, false); }
    @Override public String toString() { return id; }
}

interface DriverMatcher { Optional<Driver> match(Location p, List<Driver> ds); }

final class NearestMatcher implements DriverMatcher {
    public Optional<Driver> match(Location p, List<Driver> ds) {
        return ds.stream().filter(Driver::isFree)
                .min(Comparator.comparingInt(d -> d.at().distanceTo(p)));
    }
}
