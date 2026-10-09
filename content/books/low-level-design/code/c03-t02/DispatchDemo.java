import java.util.Comparator;
import java.util.List;

public class DispatchDemo {
    public static void main(String[] args) {
        List<Car> cars = List.of(new Car("A", 2, Direction.UP),
                new Car("B", 6, Direction.DOWN),
                new Car("C", 9, Direction.IDLE));
        DispatchStrategy strategy = new NearestApproaching();
        for (int call : new int[] {5, 1, 8}) {
            System.out.println("call at " + call + " -> car "
                    + strategy.pick(cars, call).id());
        }
    }
}

enum Direction { UP, DOWN, IDLE }

record Car(String id, int floor, Direction dir) {
    boolean approaching(int f) {
        return dir == Direction.IDLE
                || (dir == Direction.UP && f >= floor)
                || (dir == Direction.DOWN && f <= floor);
    }
}

// The building asks the strategy; swap it to change the policy.
interface DispatchStrategy {
    Car pick(List<Car> cars, int floor);
}

final class NearestApproaching implements DispatchStrategy {
    public Car pick(List<Car> cars, int floor) {
        return cars.stream()
                .min(Comparator.comparingInt(c -> cost(c, floor)))
                .orElseThrow();
    }

    // a car moving away must finish its trip first, so it costs much more
    private static int cost(Car c, int floor) {
        int distance = Math.abs(c.floor() - floor);
        return c.approaching(floor) ? distance : distance + 1000;
    }
}
