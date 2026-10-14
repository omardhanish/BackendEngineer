import java.util.HashMap;
import java.util.Map;

public class TokenBucket {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock();
        RateLimiter limiter = new TokenBucketLimiter(3, 1, clock);
        for (int i = 0; i < 4; i++) show(clock, limiter);
        clock.set(500);
        show(clock, limiter);
        clock.set(1500);
        show(clock, limiter);
        clock.set(60_000);
        show(clock, limiter);
    }

    static void show(ManualClock clock, RateLimiter limiter) {
        System.out.println("t=" + clock.nowMillis() + " "
            + limiter.tryAcquire("k1"));
    }
}

interface Clock { long nowMillis(); }

final class ManualClock implements Clock {
    private long now;
    public long nowMillis() { return now; }
    void set(long millis) { now = millis; }
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

interface RateLimiter { Decision tryAcquire(String key); }

final class TokenBucketLimiter implements RateLimiter {
    private static final long ONE = 1000;      // one token = 1000 milli-tokens
    private final long capacity;               // in milli-tokens
    private final long perSecond;              // tokens added per second
    private final Clock clock;
    private final Map<String, Bucket> buckets = new HashMap<>();

    private static final class Bucket {
        long tokens;
        long lastRefill;
        Bucket(long tokens, long at) { this.tokens = tokens; lastRefill = at; }
    }

    TokenBucketLimiter(int capacity, int perSecond, Clock clock) {
        if (capacity <= 0 || perSecond <= 0) {
            throw new IllegalArgumentException("capacity and rate must be > 0");
        }
        this.capacity = capacity * ONE;
        this.perSecond = perSecond;
        this.clock = clock;
    }

    public Decision tryAcquire(String key) {
        long now = clock.nowMillis();
        Bucket b = buckets.computeIfAbsent(key, k -> new Bucket(capacity, now));
        long elapsed = now - b.lastRefill;     // ms since the last refill
        b.tokens = Math.min(capacity, b.tokens + elapsed * perSecond);
        b.lastRefill = now;
        if (b.tokens >= ONE) {
            b.tokens -= ONE;
            return Decision.allow((int) (b.tokens / ONE));
        }
        long missing = ONE - b.tokens;         // milli-tokens still needed
        long wait = (missing + perSecond - 1) / perSecond;   // round up
        return Decision.reject(wait);
    }
}
