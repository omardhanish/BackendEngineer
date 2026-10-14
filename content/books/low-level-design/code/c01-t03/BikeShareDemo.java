import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
public class BikeShareDemo {
    public static void main(String[] args) {
        var share = new BikeShare(r -> r.family() ? 2 : 1);
        var quay = new Station("Quay");
        for (String id : List.of("B1", "B2", "B3"))
            share.addBike(new Bike(id), quay);
        var alice = new Rider("alice", false);
        share.unlock(alice, "B1");
        attempt(() -> share.dock(new Rider("bob", false), "B1", quay));
        attempt(() -> share.unlock(alice, "B2"));
        share.dock(alice, "B1", new Station("Park"));
        System.out.println("Docked: " + share.docked());
    }
    static void attempt(Runnable action) {
        try { action.run(); }
        catch (ShareException e) { System.out.println(e.getMessage()); }
    }
}
record Bike(String id) {}
record Station(String name) {}
record Rider(String id, boolean family) {}
record Ride(Rider rider, Bike bike) {}   // the noun the rush missed
interface RideLimit { int maxRides(Rider rider); }
class ShareException extends RuntimeException {
    ShareException(String message) { super(message); }
}

final class BikeShare {
    private final RideLimit limit;
    private final Map<String, Bike> bikes = new LinkedHashMap<>();
    private final Map<String, Station> dockedAt = new LinkedHashMap<>();
    private final Map<String, Ride> ridesByBike = new LinkedHashMap<>();
    BikeShare(RideLimit limit) { this.limit = Objects.requireNonNull(limit); }
    void addBike(Bike bike, Station at) {
        bikes.put(bike.id(), bike);
        dockedAt.put(bike.id(), at);
    }
    void unlock(Rider rider, String bikeId) {
        Bike bike = bikes.get(bikeId);
        if (bike == null) throw new ShareException("no bike " + bikeId);
        if (ridesByBike.containsKey(bikeId))
            throw new ShareException(bikeId + " is already out");
        long riding = ridesByBike.values().stream()
                .filter(r -> r.rider().equals(rider)).count();
        if (riding >= limit.maxRides(rider))
            throw new ShareException(rider.id() + " is at the ride limit");
        dockedAt.remove(bikeId);
        ridesByBike.put(bikeId, new Ride(rider, bike));
    }
    void dock(Rider rider, String bikeId, Station at) {
        Ride ride = ridesByBike.get(bikeId);
        if (ride == null || !ride.rider().equals(rider))
            throw new ShareException(rider.id() + " is not riding " + bikeId);
        ridesByBike.remove(bikeId);
        dockedAt.put(bikeId, Objects.requireNonNull(at, "station"));
    }
    List<String> docked() {
        return dockedAt.entrySet().stream()
                .map(e -> e.getKey() + "@" + e.getValue().name()).toList();
    }
}
