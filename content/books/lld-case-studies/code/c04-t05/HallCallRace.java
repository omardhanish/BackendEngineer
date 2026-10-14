import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.atomic.AtomicInteger;

public class HallCallRace {
    public static void main(String[] args) throws Exception {
        System.out.println("check-then-act dispatches: " + race(false));
        System.out.println("computeIfAbsent dispatches: " + race(true));
    }

    static int race(boolean atomic) throws Exception {
        var open = new ConcurrentHashMap<String, String>();
        var together = new CyclicBarrier(2);
        var dispatches = new AtomicInteger();
        String[] cars = { "E1", "E2" };
        Thread[] panels = new Thread[2];
        for (int i = 0; i < 2; i++) {
            String car = cars[i];
            panels[i] = new Thread(() -> {
                String key = "5:UP";               // floor 5, UP button
                if (atomic) {
                    await(together);
                    open.computeIfAbsent(key, k -> {
                        dispatches.incrementAndGet();
                        return car;
                    });
                } else {
                    boolean free = !open.containsKey(key);
                    await(together);               // both have looked
                    if (free) {
                        open.put(key, car);
                        dispatches.incrementAndGet();
                    }
                }
            });
            panels[i].start();
        }
        for (Thread p : panels) p.join();
        return dispatches.get();
    }

    static void await(CyclicBarrier b) {
        try {
            b.await();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
