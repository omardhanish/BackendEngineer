import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class HitCounterDemo {
    public static void main(String[] args) throws InterruptedException {
        HitCounter counter = new HitCounter();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        for (int t = 0; t < 4; t++) {
            pool.submit(() -> {
                for (int i = 0; i < 1000; i++) {
                    counter.hit(i % 2 == 0 ? "/home" : "/cart");
                }
            });
        }
        pool.shutdown();
        if (!pool.awaitTermination(10, TimeUnit.SECONDS))
            throw new IllegalStateException("timed out");
        System.out.println(counter.snapshot());
    }
}

// Thread safety lives inside the class: callers never lock.
final class HitCounter {
    private final Map<String, Integer> hits = new ConcurrentHashMap<>();

    void hit(String path) {
        hits.merge(path, 1, Integer::sum); // atomic read-modify-write
    }

    Map<String, Integer> snapshot() {
        return new TreeMap<>(hits); // sorted copy, safe to hand out
    }
}
