import java.util.*;

public class WindowDemo {
    public static void main(String[] args) {
        Limiter fixed = new FixedWindow(2, 1000);
        Limiter sliding = new SlidingLog(2, 1000);
        for (long t : new long[] { 900, 950, 1000, 1050, 1950 }) {
            System.out.println("t=" + t + " fixed:" + fixed.allow("u1", t)
                    + " sliding:" + sliding.allow("u1", t));
        }
        System.out.println("u2 sliding:" + sliding.allow("u2", 1050));
    }
}

interface Limiter { boolean allow(String client, long nowMs); }

final class FixedWindow implements Limiter {
    private final int limit;
    private final long windowMs;
    private final Map<String, long[]> state = new HashMap<>(); // start, count
    FixedWindow(int limit, long windowMs) {
        this.limit = limit; this.windowMs = windowMs;
    }
    public synchronized boolean allow(String client, long now) {
        long start = now - now % windowMs;
        long[] s = state.computeIfAbsent(client, k -> new long[] { start, 0 });
        if (s[0] != start) { s[0] = start; s[1] = 0; } // new window: reset
        if (s[1] >= limit) return false;
        s[1]++;
        return true;
    }
}

final class SlidingLog implements Limiter {
    private final int limit;
    private final long windowMs;
    private final Map<String, Deque<Long>> logs = new HashMap<>();
    SlidingLog(int limit, long windowMs) {
        this.limit = limit; this.windowMs = windowMs;
    }
    public synchronized boolean allow(String client, long now) {
        Deque<Long> log = logs.computeIfAbsent(client, k -> new ArrayDeque<>());
        while (!log.isEmpty() && log.peekFirst() <= now - windowMs)
            log.pollFirst(); // forget requests older than one window
        if (log.size() >= limit) return false;
        log.addLast(now);
        return true;
    }
}
