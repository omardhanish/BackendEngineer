import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class CarFailover {
    public static void main(String[] args) {
        Dispatcher d = new Dispatcher(List.of("E1", "E2"), 30);
        d.heartbeat("E1", 0);
        d.heartbeat("E2", 0);
        d.assign("6:DOWN", "E2");
        d.assign("3:UP", "E2");
        d.assign("9:DOWN", "E1");
        d.heartbeat("E1", 15);       // E1 keeps moving; E2 goes silent
        d.sweep(20);
        d.sweep(40);
        d.assign("7:UP", "E2");      // E2 is preferred but down
        d.heartbeat("E2", 41);       // it wakes up: still not trusted
        System.out.println("calls " + d.calls());
    }
}

class Dispatcher {
    private final List<String> cars;
    private final long timeoutSec;
    private final Map<String, Long> lastSeen = new TreeMap<>();
    private final List<String> down = new ArrayList<>();
    private final Map<String, String> calls = new LinkedHashMap<>();

    Dispatcher(List<String> cars, long timeoutSec) {
        this.cars = List.copyOf(cars);
        this.timeoutSec = timeoutSec;
    }

    synchronized void heartbeat(String car, long at) {
        if (down.contains(car)) {
            System.out.println("t=" + at + " " + car + " ignored: inspect");
            return;
        }
        lastSeen.put(car, at);
    }

    synchronized void assign(String call, String preferred) {
        String car = down.contains(preferred) ? healthy() : preferred;
        calls.put(call, car);
        System.out.println("assign " + call + " -> " + car);
    }

    synchronized void sweep(long now) {
        for (Map.Entry<String, Long> e : lastSeen.entrySet()) {
            String car = e.getKey();
            if (down.contains(car) || now - e.getValue() <= timeoutSec)
                continue;
            down.add(car);
            System.out.println("t=" + now + " " + car + " stuck: alarm");
            calls.replaceAll((call, c) -> c.equals(car) ? healthy() : c);
        }
        System.out.println("t=" + now + " calls " + calls);
    }

    synchronized Map<String, String> calls() {
        return new LinkedHashMap<>(calls);
    }

    private String healthy() {
        return cars.stream().filter(c -> !down.contains(c)).findFirst()
            .orElseThrow(() -> new IllegalStateException("no car"));
    }
}
