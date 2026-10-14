import java.util.HashMap;
import java.util.Map;

public class ClassDesign {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock();
        LimitRule rule = new LimitRule(3, 1000);
        RateLimiter limiter = new FixedWindowLimiter(rule, clock);
        for (int i = 1; i <= 4; i++) {
            System.out.println("t=0    k1 " + limiter.tryAcquire("k1"));
        }
        System.out.println("t=0    k2 " + limiter.tryAcquire("k2"));
        clock.advance(1000);
        System.out.println("t=1000 k1 " + limiter.tryAcquire("k1"));
    }
}

interface Clock { long nowMillis(); }

final class ManualClock implements Clock {
    private long now;
    public long nowMillis() { return now; }
    void advance(long millis) { now += millis; }
}

record LimitRule(int limit, long windowMillis) {
    LimitRule {
        if (limit <= 0 || windowMillis <= 0) {
            throw new IllegalArgumentException("limit and window must be > 0");
        }
    }
}

record Decision(boolean allowed, int remaining, long retryAfterMillis) {
    static Decision allow(int remaining) {
        return new Decision(true, remaining, 0);
    }
    static Decision reject(long retryAfterMillis) {
        return new Decision(false, 0, retryAfterMillis);
    }
    public String toString() {
        return allowed ? "ALLOW remaining=" + remaining
                       : "REJECT retryAfter=" + retryAfterMillis + "ms";
    }
}

interface RateLimiter {
    Decision tryAcquire(String key);
}

final class FixedWindowLimiter implements RateLimiter {
    private final LimitRule rule;
    private final Clock clock;
    private final Map<String, long[]> windows = new HashMap<>();

    FixedWindowLimiter(LimitRule rule, Clock clock) {
        this.rule = rule;
        this.clock = clock;
    }

    public Decision tryAcquire(String key) {
        long now = clock.nowMillis();
        long start = now - now % rule.windowMillis();
        long[] w = windows.computeIfAbsent(key, k -> new long[] {start, 0});
        if (w[0] != start) { w[0] = start; w[1] = 0; }
        if (w[1] < rule.limit()) {
            w[1]++;
            return Decision.allow((int) (rule.limit() - w[1]));
        }
        return Decision.reject(start + rule.windowMillis() - now);
    }
}
