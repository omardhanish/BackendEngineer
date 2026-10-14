import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;

public class CoreElevator {
    public static void main(String[] args) {
        Elevator e1 = new Elevator("E1", 0);
        Elevator e2 = new Elevator("E2", 8);
        ElevatorController ctl = new ElevatorController(
            List.of(e1, e2), new NearestCarStrategy());
        ctl.hallCall(6, Direction.DOWN);
        ctl.hallCall(2, Direction.UP);
        ctl.carCall("E1", 5);
        for (int t = 1; t <= 8; t++) ctl.tick(t);
    }
}

enum Direction { UP, DOWN, IDLE }

enum ElevatorState { IDLE, MOVING, DOORS_OPEN, OUT_OF_SERVICE }

interface SchedulingStrategy {
    Elevator choose(int floor, Direction d, List<Elevator> cars);
}

class ElevatorController {
    private final List<Elevator> cars;
    private final SchedulingStrategy strategy;

    ElevatorController(List<Elevator> cars, SchedulingStrategy s) {
        this.cars = List.copyOf(cars);
        this.strategy = s;
    }

    void hallCall(int floor, Direction d) {
        Elevator e = strategy.choose(floor, d, cars);
        e.addStop(floor);
        System.out.println("hall " + floor + " " + d + " -> " + e.id);
    }

    void carCall(String carId, int floor) {
        cars.stream().filter(e -> e.id.equals(carId)).findFirst()
            .orElseThrow().addStop(floor);
    }

    void tick(int t) {
        StringBuilder line = new StringBuilder("t" + t);
        for (Elevator e : cars) {
            e.tick();
            line.append(" | ").append(e);
        }
        System.out.println(line);
    }
}

class NearestCarStrategy implements SchedulingStrategy {
    public Elevator choose(int f, Direction d, List<Elevator> cars) {
        return cars.stream()
            .filter(e -> e.state() != ElevatorState.OUT_OF_SERVICE)
            .min(Comparator.comparingInt((Elevator e) -> cost(e, f, d))
                .thenComparing(e -> e.id))
            .orElseThrow(() -> new IllegalStateException("no car"));
    }

    static int cost(Elevator e, int f, Direction d) {
        Direction h = e.heading();
        if (h == Direction.IDLE) return Math.abs(e.floor() - f);
        boolean ahead = h == Direction.UP ? f >= e.floor() : f <= e.floor();
        if (h == d && ahead) return Math.abs(e.floor() - f);
        int turn = e.farthestStop();
        return Math.abs(e.floor() - turn) + Math.abs(turn - f);
    }
}

class Elevator {
    final String id;
    private int floor;
    private Direction direction = Direction.IDLE;
    private ElevatorState state = ElevatorState.IDLE;
    private final TreeSet<Integer> stops = new TreeSet<>();

    Elevator(String id, int floor) { this.id = id; this.floor = floor; }

    int floor() { return floor; }
    ElevatorState state() { return state; }
    void addStop(int f) { stops.add(f); }

    Direction heading() {
        if (stops.isEmpty()) return Direction.IDLE;
        if (direction != Direction.IDLE) return direction;
        return stops.last() > floor ? Direction.UP : Direction.DOWN;
    }

    int farthestStop() {
        return heading() == Direction.UP ? stops.last() : stops.first();
    }

    void tick() {
        if (state == ElevatorState.OUT_OF_SERVICE) return;
        if (state == ElevatorState.DOORS_OPEN) {   // doors close first
            state = ElevatorState.IDLE;
            return;
        }
        if (stops.remove(floor)) {                 // arrived at a stop
            state = ElevatorState.DOORS_OPEN;
            return;
        }
        if (stops.isEmpty()) {
            direction = Direction.IDLE;
            return;
        }
        direction = nextDirection();
        floor += direction == Direction.UP ? 1 : -1;
        state = ElevatorState.MOVING;
    }

    private Direction nextDirection() {            // LOOK: keep going
        if (direction == Direction.UP && stops.higher(floor) != null)
            return Direction.UP;
        if (direction == Direction.DOWN && stops.lower(floor) != null)
            return Direction.DOWN;
        return stops.higher(floor) != null ? Direction.UP : Direction.DOWN;
    }

    public String toString() {
        return id + "@" + floor + " " + state;
    }
}
