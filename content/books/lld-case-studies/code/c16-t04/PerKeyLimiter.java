import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class PerKeyLimiter {
    public static void main(String[] args) throws Exception {
        AtomicLong time = new AtomicLong(0);   // a manual, thread-safe clock
        var limiter = new SafeTokenBucketLimiter(100, 50, time::get);
        System.out.println("t=0    " + storm(limiter));
        time.set(1000);                        // one second later: +50 each
        System.out.println("t=1000 " + storm(limiter));
        System.out.println("buckets created: " + limiter.created.get());
    }

    // 8 threads x 500 calls, alternating between keys k1 and k2
    static Map<String, Integer> storm(SafeTokenBucketLimiter limiter)
            throws InterruptedException {
        Map<String, AtomicInteger> allowed = new ConcurrentHashMap<>();
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            threads.add(new Thread(() -> {
                for (int i = 0; i < 500; i++) {
                    String key = (i % 2 == 0) ? "k1" : "k2";
                    if (limiter.tryAcquire(key)) {
                        allowed.computeIfAbsent(key, k -> new AtomicInteger())
                               .incrementAndGet();
                    }
                }
            }));
        }
        for (Thread th : threads) th.start();
        for (Thread th : threads) th.join();
        Map<String, Integer> sorted = new TreeMap<>();
        allowed.forEach((k, v) -> sorted.put(k, v.get()));
        return sorted;
    }
}

interface Clock { long nowMillis(); }

final class SafeTokenBucketLimiter {
    private static final long ONE = 1000;      // milli-tokens per token
    private final long capacity, perSecond;
    private final Clock clock;
    private final ConcurrentHashMap<String, Bucket> buckets =
        new ConcurrentHashMap<>();
    final AtomicInteger created = new AtomicInteger();

    private static final class Bucket {
        long tokens, lastRefill;               // guarded by this bucket's lock
        Bucket(long tokens, long at) { this.tokens = tokens; lastRefill = at; }
    }

    SafeTokenBucketLimiter(int capacity, int perSecond, Clock clock) {
        this.capacity = capacity * ONE;
        this.perSecond = perSecond;
        this.clock = clock;
    }

    boolean tryAcquire(String key) {
        Bucket b = buckets.computeIfAbsent(key, k -> {
            created.incrementAndGet();         // runs once per key
            return new Bucket(capacity, clock.nowMillis());
        });
        synchronized (b) {                     // one lock per key, not global
            long now = clock.nowMillis();
            b.tokens = Math.min(capacity,
                b.tokens + Math.max(0, now - b.lastRefill) * perSecond);
            b.lastRefill = Math.max(b.lastRefill, now);
            if (b.tokens < ONE) return false;
            b.tokens -= ONE;
            return true;
        }
    }
}
