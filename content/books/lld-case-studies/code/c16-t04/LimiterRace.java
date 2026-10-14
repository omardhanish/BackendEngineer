import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class LimiterRace {
    public static void main(String[] args) throws Exception {
        CyclicBarrier gap = new CyclicBarrier(2);
        System.out.println("check-then-act " + race(new UnsafeBucket(1, gap)));
        System.out.println("synchronized   " + race(new LockedBucket(1)));
        System.out.println("compareAndSet  " + race(new CasBucket(1)));
    }

    static String race(Bucket bucket) throws Exception {
        AtomicInteger allowed = new AtomicInteger();
        Runnable caller = () -> {
            if (bucket.tryTake()) allowed.incrementAndGet();
        };
        Thread a = new Thread(caller), b = new Thread(caller);
        a.start(); b.start();
        a.join(); b.join();                    // both done before printing
        return "allowed=" + allowed.get() + " tokensLeft=" + bucket.left();
    }
}

interface Bucket { boolean tryTake(); long left(); }

final class UnsafeBucket implements Bucket {
    private final AtomicLong tokens;           // each call is atomic...
    private final CyclicBarrier gap;
    UnsafeBucket(long tokens, CyclicBarrier gap) {
        this.tokens = new AtomicLong(tokens); this.gap = gap;
    }
    public boolean tryTake() {
        if (tokens.get() < 1) return false;    // step 1: check
        try { gap.await(); }                   // wait until both have checked
        catch (Exception e) { throw new IllegalStateException(e); }
        tokens.decrementAndGet();              // step 2: act on a stale check
        return true;
    }
    public long left() { return tokens.get(); }
}

final class LockedBucket implements Bucket {
    private long tokens;
    LockedBucket(long tokens) { this.tokens = tokens; }
    public synchronized boolean tryTake() {   // check and act under one lock
        if (tokens < 1) return false;
        tokens--;
        return true;
    }
    public synchronized long left() { return tokens; }
}

final class CasBucket implements Bucket {
    private final AtomicLong tokens;
    CasBucket(long tokens) { this.tokens = new AtomicLong(tokens); }
    public boolean tryTake() {
        while (true) {
            long seen = tokens.get();
            if (seen < 1) return false;
            if (tokens.compareAndSet(seen, seen - 1)) return true;
        }                                      // lost the race: read again
    }
    public long left() { return tokens.get(); }
}
