import java.util.*;
import java.util.function.BiFunction;

public class Extensible {
    static long now;

    public static void main(String[] args) {
        LimiterFactory factory = new LimiterFactory(() -> now);
        factory.register("fixed", FixedWindowLimiter::new);
        factory.register("sliding-log", SlidingLogLimiter::new); // added later
        Map<String, String> config = new LinkedHashMap<>();
        config.put("search", "fixed 3/1000");
        config.put("upload", "sliding-log 2/1000 + fixed 3/60000");
        for (Map.Entry<String, String> route : config.entrySet()) {
            RateLimiter limiter = factory.build(route.getValue());
            StringBuilder out = new StringBuilder(route.getKey() + ":");
            for (long t : new long[] {0, 0, 0, 0, 1000, 1000}) {
                now = t;
                out.append(limiter.tryAcquire("u1") ? " Y" : " n");
            }
            System.out.println(out);
        }
        try {
            factory.build("leaky 1/1000");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected config: " + e.getMessage());
        }
    }
}

interface Clock { long nowMillis(); }
interface RateLimiter { boolean tryAcquire(String key); }
record LimitRule(int limit, long windowMillis) {
    LimitRule {
        if (limit <= 0 || windowMillis <= 0) {
            throw new IllegalArgumentException("limit and window must be > 0");
        }
    }
}

final class LimiterFactory {                   // open for new algorithms
    private final Map<String, BiFunction<LimitRule, Clock, RateLimiter>>
        makers = new HashMap<>();
    private final Clock clock;
    LimiterFactory(Clock clock) { this.clock = clock; }

    void register(String name, BiFunction<LimitRule, Clock, RateLimiter> m) {
        makers.put(name, m);
    }
    RateLimiter build(String spec) {           // "algo n/ms + algo n/ms"
        List<RateLimiter> parts = new ArrayList<>();
        for (String part : spec.split("\\s*\\+\\s*")) {
            String[] w = part.trim().split("[ /]");
            var maker = makers.get(w[0]);
            if (maker == null) {
                throw new IllegalArgumentException("unknown algorithm " + w[0]);
            }
            LimitRule rule = new LimitRule(Integer.parseInt(w[1]),
                                           Long.parseLong(w[2]));
            parts.add(maker.apply(rule, clock));
        }
        if (parts.size() == 1) return parts.get(0);
        return key -> parts.stream().allMatch(p -> p.tryAcquire(key));
    }
}

final class FixedWindowLimiter implements RateLimiter {
    private final LimitRule r; private final Clock c;
    private final Map<String, long[]> state = new HashMap<>();
    FixedWindowLimiter(LimitRule r, Clock c) { this.r = r; this.c = c; }
    public boolean tryAcquire(String key) {
        long start = c.nowMillis() / r.windowMillis() * r.windowMillis();
        long[] s = state.computeIfAbsent(key, k -> new long[] {start, 0});
        if (s[0] != start) { s[0] = start; s[1] = 0; }
        if (s[1] >= r.limit()) return false;
        s[1]++;
        return true;
    }
}

final class SlidingLogLimiter implements RateLimiter {
    private final LimitRule r; private final Clock c;
    private final Map<String, Deque<Long>> logs = new HashMap<>();
    SlidingLogLimiter(LimitRule r, Clock c) { this.r = r; this.c = c; }
    public boolean tryAcquire(String key) {
        long now = c.nowMillis();
        Deque<Long> log = logs.computeIfAbsent(key, k -> new ArrayDeque<>());
        while (!log.isEmpty() && log.peekFirst() <= now - r.windowMillis()) {
            log.pollFirst();
        }
        if (log.size() >= r.limit()) return false;
        log.addLast(now);
        return true;
    }
}
