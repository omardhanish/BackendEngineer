public class BreakerCore {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock();
        CircuitBreaker cb = new CircuitBreaker(3, 5000, clock);
        String[] events = {"fail", "fail", "fail", "call", "wait 5000",
                           "fail", "wait 5000", "ok", "call"};
        for (String e : events) {
            if (e.startsWith("wait")) {
                clock.sleep(Long.parseLong(e.substring(5)));
            } else if (!cb.allowRequest()) {
                System.out.printf("t=%-5d %-4s rejected fast%n",
                    clock.now(), e);
                continue;
            } else if (e.equals("fail")) {
                cb.onFailure();
            } else if (e.equals("ok")) {
                cb.onSuccess();
            }
            System.out.printf("t=%-5d %-9s -> %s%n", clock.now(), e,
                cb.state());
        }
    }
}

enum State { CLOSED, OPEN, HALF_OPEN }

class CircuitBreaker {
    private final int failureThreshold;
    private final long openMs;
    private final ManualClock clock;
    private State state = State.CLOSED;
    private int failures;
    private long openedAt;

    CircuitBreaker(int failureThreshold, long openMs, ManualClock clock) {
        this.failureThreshold = failureThreshold;
        this.openMs = openMs;
        this.clock = clock;
    }

    boolean allowRequest() {
        if (state == State.OPEN && clock.now() - openedAt >= openMs) {
            state = State.HALF_OPEN;          // cool-down over: one trial
            return true;
        }
        return state == State.CLOSED;
    }

    void onSuccess() {
        state = State.CLOSED;
        failures = 0;
    }

    void onFailure() {
        failures++;
        if (state == State.HALF_OPEN || failures >= failureThreshold) {
            state = State.OPEN;              // trip, or re-trip after trial
            openedAt = clock.now();
        }
    }

    State state() { return state; }
}

class ManualClock {
    private long now;
    long now() { return now; }
    void sleep(long ms) { now += ms; }
}
