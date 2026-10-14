import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

public class DomainModel {
    public static void main(String[] args) {
        Building tower = new Building(0, 9);
        Elevator e1 = new Elevator("E1", 0, 8);
        Elevator e2 = new Elevator("E2", 6, 8);
        ElevatorController ctl =
            new ElevatorController(tower, List.of(e1, e2));
        Request call = Request.hall(tower.floor(3), Direction.UP);
        Request ride = Request.car(tower.floor(7));
        System.out.println(call);
        System.out.println(ride);
        e1.addStop(ride.floor().number());
        e1.addStop(call.floor().number());
        ctl.elevators().forEach(System.out::println);
        try {
            Request.hall(tower.floor(9), Direction.UP);
        } catch (IllegalArgumentException ex) {
            System.out.println("rejected: " + ex.getMessage());
        }
        try {
            tower.floor(12);
        } catch (IllegalArgumentException ex) {
            System.out.println("rejected: " + ex.getMessage());
        }
    }
}

enum Direction { UP, DOWN, IDLE }

enum ElevatorState { IDLE, MOVING, DOORS_OPEN, OUT_OF_SERVICE }

enum Source { HALL, CAR }

record Floor(int number, boolean hasUp, boolean hasDown) {}

record Request(Floor floor, Direction direction, Source source) {
    Request {
        if (source == Source.CAR && direction != Direction.IDLE)
            throw new IllegalArgumentException("car call has no direction");
        if (direction == Direction.UP && !floor.hasUp())
            throw new IllegalArgumentException(
                "no UP button on floor " + floor.number());
        if (direction == Direction.DOWN && !floor.hasDown())
            throw new IllegalArgumentException(
                "no DOWN button on floor " + floor.number());
    }

    static Request hall(Floor f, Direction d) {
        if (d == Direction.IDLE)
            throw new IllegalArgumentException("hall call needs UP or DOWN");
        return new Request(f, d, Source.HALL);
    }

    static Request car(Floor f) {
        return new Request(f, Direction.IDLE, Source.CAR);
    }

    public String toString() {
        String d = source == Source.HALL ? " " + direction : "";
        return source + " call: floor " + floor.number() + d;
    }
}

class Building {
    private final int lowest;
    private final List<Floor> floors = new ArrayList<>();

    Building(int lowest, int highest) {
        this.lowest = lowest;
        for (int n = lowest; n <= highest; n++)
            floors.add(new Floor(n, n < highest, n > lowest));
    }

    Floor floor(int n) {
        int i = n - lowest;
        if (i < 0 || i >= floors.size())
            throw new IllegalArgumentException("no floor " + n);
        return floors.get(i);
    }
}

class Elevator {
    final String id;
    final int maxPassengers;
    private int currentFloor;
    private Direction direction = Direction.IDLE;
    private ElevatorState state = ElevatorState.IDLE;
    private final TreeSet<Integer> stops = new TreeSet<>();

    Elevator(String id, int startFloor, int maxPassengers) {
        if (maxPassengers < 1)
            throw new IllegalArgumentException("capacity must be >= 1");
        this.id = id;
        this.currentFloor = startFloor;
        this.maxPassengers = maxPassengers;
    }

    void addStop(int floor) { stops.add(floor); }

    public String toString() {
        return id + " at " + currentFloor + " " + state + " "
            + direction + " stops=" + stops;
    }
}

class ElevatorController {
    private final Building building;
    private final List<Elevator> elevators;

    ElevatorController(Building building, List<Elevator> cars) {
        this.building = building;
        this.elevators = List.copyOf(cars);
    }

    List<Elevator> elevators() { return elevators; }
}

interface SchedulingStrategy {
    Elevator choose(int floor, Direction d, List<Elevator> cars);
}
