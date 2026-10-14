import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

public class Windows {
    static long now;                           // the demo's clock
    public static void main(String[] args) {
        Clock clock = () -> now;
        RateLimiter[] limiters = {
            new FixedWindowLimiter(4, 1000, clock),
            new SlidingLogLimiter(4, 1000, clock),
            new SlidingCounterLimiter(4, 1000, clock) };
        for (RateLimiter limiter : limiters) {
            StringBuilder line = new StringBuilder(limiter.name());
            for (long t : new long[] {900, 1000, 1950}) {
                now = t;                       // a burst of 4 calls at t
                int allowed = 0;
                for (int i = 0; i < 4; i++) {
                    if (limiter.tryAcquire("k1")) allowed++;
                }
                line.append(" t=").append(t).append(":").append(allowed);
            }
            System.out.println(line);
        }
    }
}

interface Clock { long nowMillis(); }

interface RateLimiter {
    boolean tryAcquire(String key);
    String name();
}

abstract class WindowLimiter implements RateLimiter {
    final int limit; final long window; final Clock clock;
    WindowLimiter(int limit, long window, Clock clock) {
        this.limit = limit; this.window = window; this.clock = clock;
    }
}

final class FixedWindowLimiter extends WindowLimiter {
    private final Map<String, long[]> state = new HashMap<>(); // start, count
    FixedWindowLimiter(int l, long w, Clock c) { super(l, w, c); }
    public String name() { return "fixed  "; }
    public boolean tryAcquire(String key) {
        long start = clock.nowMillis() / window * window;
        long[] s = state.computeIfAbsent(key, k -> new long[] {start, 0});
        if (s[0] != start) { s[0] = start; s[1] = 0; }
        if (s[1] >= limit) return false;
        s[1]++;
        return true;
    }
}

final class SlidingLogLimiter extends WindowLimiter {
    private final Map<String, Deque<Long>> logs = new HashMap<>();
    SlidingLogLimiter(int l, long w, Clock c) { super(l, w, c); }
    public String name() { return "log    "; }
    public boolean tryAcquire(String key) {
        long now = clock.nowMillis();
        Deque<Long> log = logs.computeIfAbsent(key, k -> new ArrayDeque<>());
        while (!log.isEmpty() && log.peekFirst() <= now - window) {
            log.pollFirst();                   // drop calls outside the window
        }
        if (log.size() >= limit) return false;
        log.addLast(now);
        return true;
    }
}

final class SlidingCounterLimiter extends WindowLimiter {
    private final Map<String, long[]> state = new HashMap<>(); // start,prev,cur
    SlidingCounterLimiter(int l, long w, Clock c) { super(l, w, c); }
    public String name() { return "counter"; }
    public boolean tryAcquire(String key) {
        long now = clock.nowMillis(), start = now / window * window;
        long[] s = state.computeIfAbsent(key, k -> new long[] {start, 0, 0});
        if (s[0] != start) {                   // a new window has begun
            s[1] = (start - s[0] == window) ? s[2] : 0;
            s[0] = start; s[2] = 0;
        }
        long elapsed = now - start;            // weight prev by what overlaps
        long weighted = s[1] * (window - elapsed) + s[2] * window;
        if (weighted >= limit * window) return false;
        s[2]++;
        return true;
    }
}
