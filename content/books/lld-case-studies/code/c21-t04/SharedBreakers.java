import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.LongAdder;

public class SharedBreakers {
    static final ConcurrentHashMap<String, CircuitBreaker> BREAKERS =
        new ConcurrentHashMap<>();
    static final AtomicInteger CREATED = new AtomicInteger();
    static final LongAdder CALLS = new LongAdder();

    public static void main(String[] args) throws Exception {
        Thread[] workers = new Thread[8];
        for (int i = 0; i < workers.length; i++) {
            workers[i] = new Thread(() -> {
                for (int n = 0; n < 500; n++) {
                    call("payments", false);   // this service is down
                    call("search", true);      // this one is healthy
                }
            });
            workers[i].start();
        }
        for (Thread w : workers) w.join();
        System.out.println("breakers created: " + CREATED.get());
        System.out.println("calls: " + CALLS.sum());
        System.out.println("payments: " + breaker("payments").mode());
        System.out.println("search:   " + breaker("search").mode());
    }

    static CircuitBreaker breaker(String host) {
        return BREAKERS.computeIfAbsent(host, h -> {
            CREATED.incrementAndGet();         // runs once per host
            return new CircuitBreaker(5, 5000, () -> 0L);
        });
    }

    static void call(String host, boolean succeeds) {
        CALLS.increment();
        CircuitBreaker cb = breaker(host);
        if (!cb.allowRequest()) return;        // rejected fast
        if (succeeds) cb.onSuccess(); else cb.onFailure();
    }
}

enum Mode { CLOSED, OPEN, HALF_OPEN }

record Snap(Mode mode, int failures, long openedAt) { }

interface Clock { long now(); }

class CircuitBreaker {
    private static final Snap CLOSED = new Snap(Mode.CLOSED, 0, 0);
    private final AtomicReference<Snap> state = new AtomicReference<>(CLOSED);
    private final int threshold;
    private final long openMs;
    private final Clock clock;

    CircuitBreaker(int threshold, long openMs, Clock clock) {
        this.threshold = threshold; this.openMs = openMs; this.clock = clock;
    }

    boolean allowRequest() {
        Snap s = state.get();
        if (s.mode() == Mode.CLOSED) return true;
        if (s.mode() == Mode.HALF_OPEN) return false;   // trial in flight
        if (clock.now() - s.openedAt() < openMs) return false;
        Snap trial = new Snap(Mode.HALF_OPEN, 0, s.openedAt());
        return state.compareAndSet(s, trial);           // one winner
    }

    void onSuccess() {
        state.updateAndGet(s -> s.mode() == Mode.OPEN ? s : CLOSED);
    }

    void onFailure() {
        long now = clock.now();                         // read once, outside
        state.updateAndGet(s -> {                       // may rerun: pure
            if (s.mode() == Mode.OPEN) return s;
            int f = s.failures() + 1;
            boolean trip = s.mode() == Mode.HALF_OPEN || f >= threshold;
            return trip ? new Snap(Mode.OPEN, 0, now)
                        : new Snap(Mode.CLOSED, f, 0);
        });
    }

    Mode mode() { return state.get().mode(); }
}
