import java.util.Comparator;
import java.util.List;
import java.util.Map;

public class ZonedDispatch {
    public static void main(String[] args) {
        List<Elevator> cars = List.of(new Elevator("E1", 0),
            new Elevator("E2", 0), new Elevator("E3", 12));
        SchedulingStrategy nearest = new NearestCarStrategy();
        SchedulingStrategy zoned = new ZonedStrategy(nearest, Map.of(
            "E1", new Zone(1, 9), "E2", new Zone(1, 9),
            "E3", new Zone(10, 19)));
        show(15, Direction.DOWN, nearest, zoned, cars);
        show(8, Direction.DOWN, nearest, zoned, cars);
        show(0, Direction.UP, nearest, zoned, cars);
        cars.get(0).state = ElevatorState.OUT_OF_SERVICE;
        System.out.println("E1 out of service");
        show(8, Direction.DOWN, nearest, zoned, cars);
    }

    static void show(int floor, Direction d, SchedulingStrategy a,
                     SchedulingStrategy b, List<Elevator> cars) {
        System.out.println("floor " + floor + " " + d
            + ": nearest=" + a.choose(floor, d, cars).id
            + " zoned=" + b.choose(floor, d, cars).id);
    }
}

// New class. Elevator, Controller and NearestCarStrategy are unchanged.
class ZonedStrategy implements SchedulingStrategy {
    private final SchedulingStrategy inner;
    private final Map<String, Zone> zones;

    ZonedStrategy(SchedulingStrategy inner, Map<String, Zone> zones) {
        this.inner = inner;
        this.zones = Map.copyOf(zones);
    }

    public Elevator choose(int f, Direction d, List<Elevator> cars) {
        List<Elevator> allowed = cars.stream()
            .filter(e -> zones.get(e.id).serves(f)).toList();
        return inner.choose(f, d, allowed);
    }
}

record Zone(int low, int high) {
    boolean serves(int f) { return f == 0 || (f >= low && f <= high); }
}

// Trimmed copies from CoreElevator: idle cars, distance only.
enum Direction { UP, DOWN, IDLE }

enum ElevatorState { IDLE, MOVING, DOORS_OPEN, OUT_OF_SERVICE }

interface SchedulingStrategy {
    Elevator choose(int floor, Direction d, List<Elevator> cars);
}

class NearestCarStrategy implements SchedulingStrategy {
    public Elevator choose(int f, Direction d, List<Elevator> cars) {
        return cars.stream()
            .filter(e -> e.state != ElevatorState.OUT_OF_SERVICE)
            .min(Comparator.comparingInt((Elevator e) ->
                Math.abs(e.floor - f)).thenComparing(e -> e.id))
            .orElseThrow(() -> new IllegalStateException("no car"));
    }
}

class Elevator {
    final String id;
    final int floor;
    ElevatorState state = ElevatorState.IDLE;

    Elevator(String id, int floor) { this.id = id; this.floor = floor; }
}
