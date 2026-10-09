public class TokenBucketDemo {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock();
        RateLimiter limiter = new TokenBucket(3, 1000, clock); // 3, +1 per s
        long[] times = { 0, 0, 0, 0, 500, 1000, 2500, 2500, 9000, 9000, 9000,
                9000 };
        StringBuilder line = new StringBuilder();
        for (long t : times) {
            clock.now = t;
            line.append(t).append(limiter.tryAcquire() ? ":ok " : ":no ");
        }
        System.out.println(line.toString().trim());
    }
}

interface TimeSource { long millis(); }

final class ManualClock implements TimeSource { // tests move time by hand
    long now;
    public long millis() { return now; }
}

interface RateLimiter { boolean tryAcquire(); }

final class TokenBucket implements RateLimiter {
    private final int capacity;
    private final long refillEveryMs;
    private final TimeSource clock;
    private int tokens;
    private long lastRefill;
    TokenBucket(int capacity, long refillEveryMs, TimeSource clock) {
        this.capacity = capacity; this.refillEveryMs = refillEveryMs;
        this.clock = clock; this.tokens = capacity;
        this.lastRefill = clock.millis();
    }
    public synchronized boolean tryAcquire() {
        long earned = (clock.millis() - lastRefill) / refillEveryMs;
        if (earned > 0) { // add whole tokens, never above capacity
            tokens = (int) Math.min(capacity, tokens + earned);
            lastRefill += earned * refillEveryMs;
        }
        if (tokens == 0) return false;
        tokens--;
        return true;
    }
}
