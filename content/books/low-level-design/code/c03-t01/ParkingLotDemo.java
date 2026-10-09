import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class ParkingLotDemo {
    public static void main(String[] args) {
        ParkingLot lot = new ParkingLot(List.of(new Spot("S1", Size.SMALL),
                new Spot("M1", Size.MEDIUM), new Spot("L1", Size.LARGE)));
        Ticket car = lot.park(new Vehicle("CAR-1", Size.MEDIUM)).orElseThrow();
        Ticket van = lot.park(new Vehicle("VAN-1", Size.MEDIUM)).orElseThrow();
        System.out.println(car + "\n" + van);
        Vehicle bus = new Vehicle("BUS-1", Size.LARGE);
        System.out.println("bus: " + lot.park(bus));
        lot.leave(van);
        System.out.println("bus: " + lot.park(bus));
    }
}

enum Size { SMALL, MEDIUM, LARGE } // declared smallest first
record Vehicle(String plate, Size size) {}
record Spot(String id, Size size) {}
record Ticket(String plate, String spotId) {}

final class ParkingLot {
    private final List<Spot> spots;
    private final Map<String, Vehicle> taken = new HashMap<>(); // spot id
    ParkingLot(List<Spot> spots) { this.spots = spots; }

    // smallest free spot that fits, so big spots stay free for big vehicles
    synchronized Optional<Ticket> park(Vehicle v) {
        Optional<Spot> spot = spots.stream()
                .filter(s -> !taken.containsKey(s.id()))
                .filter(s -> v.size().compareTo(s.size()) <= 0)
                .min(Comparator.comparing(Spot::size));
        spot.ifPresent(s -> taken.put(s.id(), v));
        return spot.map(s -> new Ticket(v.plate(), s.id()));
    }

    synchronized void leave(Ticket t) { taken.remove(t.spotId()); }
}
