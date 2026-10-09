import java.util.TreeSet;

public class ElevatorDemo {
    public static void main(String[] args) {
        Elevator car = new Elevator(0);
        car.request(5);
        car.request(2);
        car.step();
        car.request(1); // below the car while it climbs: waits
        car.request(8); // above the car: joins this trip
        while (car.hasWork()) car.step();
    }
}

enum Direction { UP, DOWN, IDLE }

final class Elevator {
    private final TreeSet<Integer> upStops = new TreeSet<>();
    private final TreeSet<Integer> downStops = new TreeSet<>();
    private int floor;
    private Direction dir = Direction.IDLE;

    Elevator(int floor) { this.floor = floor; }

    void request(int target) {
        if (target > floor) upStops.add(target);
        else if (target < floor) downStops.add(target);
    }

    boolean hasWork() { return !upStops.isEmpty() || !downStops.isEmpty(); }

    // keep going one way while stops remain there; call only if hasWork()
    void step() {
        boolean goUp = dir == Direction.DOWN ? downStops.isEmpty()
                                             : !upStops.isEmpty();
        dir = goUp ? Direction.UP : Direction.DOWN;
        floor = goUp ? upStops.pollFirst() : downStops.pollLast();
        System.out.println("stop at " + floor + " going " + dir);
    }
}
