import java.util.Set;

public class Decorators {
    public static void main(String[] args) {
        RateLimiter core = new FirstN(2);      // stands in for any algorithm
        CountingLimiter counted = new CountingLimiter(core);
        RateLimiter limiter = new AllowListLimiter(Set.of("ops"), counted);
        String[] calls = {"u1", "u1", "u1", "ops", "ops", "ops"};
        for (String key : calls) {
            String verdict = limiter.tryAcquire(key) ? "Y" : "n";
            System.out.println(key + " " + verdict);
        }
        System.out.println(counted.stats());
    }
}

interface RateLimiter { boolean tryAcquire(String key); }

final class FirstN implements RateLimiter {    // allows n calls in total
    private final int n; private int used;
    FirstN(int n) { this.n = n; }
    public boolean tryAcquire(String key) {
        if (used >= n) return false;
        used++;
        return true;
    }
}

final class CountingLimiter implements RateLimiter {   // adds metrics
    private final RateLimiter inner;
    private int allowed, rejected;
    CountingLimiter(RateLimiter inner) { this.inner = inner; }
    public boolean tryAcquire(String key) {
        boolean ok = inner.tryAcquire(key);
        if (ok) allowed++; else rejected++;
        return ok;
    }
    String stats() { return "allowed=" + allowed + " rejected=" + rejected; }
}

final class AllowListLimiter implements RateLimiter {  // adds a bypass
    private final Set<String> exempt;
    private final RateLimiter inner;
    AllowListLimiter(Set<String> exempt, RateLimiter inner) {
        this.exempt = exempt; this.inner = inner;
    }
    public boolean tryAcquire(String key) {
        return exempt.contains(key) || inner.tryAcquire(key);
    }
}
