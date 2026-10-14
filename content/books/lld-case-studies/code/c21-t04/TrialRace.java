import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public class TrialRace {
    public static void main(String[] args) throws Exception {
        race("check-then-act ", new NaiveBreaker());
        race("compare-and-set", new CasBreaker());
    }

    static void race(String name, Gate gate) throws Exception {
        CyclicBarrier bothRead = new CyclicBarrier(2);
        AtomicInteger trials = new AtomicInteger();
        Runnable caller = () -> {
            if (gate.allowRequest(bothRead)) trials.incrementAndGet();
        };
        Thread a = new Thread(caller);
        Thread b = new Thread(caller);
        a.start(); b.start();
        a.join(); b.join();                  // join before printing
        System.out.println(name + " trial calls sent: " + trials.get());
    }
}

enum Mode { CLOSED, OPEN, HALF_OPEN }

interface Gate {                             // cool-down is already over
    boolean allowRequest(CyclicBarrier gap);

    static void pause(CyclicBarrier gap) {   // force the bad interleaving
        try { gap.await(); } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}

class NaiveBreaker implements Gate {
    private volatile Mode mode = Mode.OPEN;

    public boolean allowRequest(CyclicBarrier gap) {
        Mode seen = mode;                    // check
        Gate.pause(gap);                     // the other thread reads too
        if (seen != Mode.OPEN) return false;
        mode = Mode.HALF_OPEN;               // act on a stale read
        return true;
    }
}

class CasBreaker implements Gate {
    private final AtomicReference<Mode> mode =
        new AtomicReference<>(Mode.OPEN);

    public boolean allowRequest(CyclicBarrier gap) {
        Gate.pause(gap);                     // same timing as above
        return mode.compareAndSet(Mode.OPEN, Mode.HALF_OPEN);
    }
}
