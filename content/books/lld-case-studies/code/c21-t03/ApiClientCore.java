import java.util.ArrayDeque;
import java.util.List;
import java.util.Random;
import java.util.Set;

public class ApiClientCore {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock();
        var script = new ArrayDeque<String>();
        Transport fake = (req, timeoutMs) -> {
            String step = script.poll();       // "503:20": 503 after 20 ms
            if (step.equals("slow")) {         // no answer: hits the timeout
                clock.sleep(timeoutMs);
                return Response.timedOut();
            }
            clock.sleep(Long.parseLong(step.substring(4)));
            return new Response(Integer.parseInt(step.substring(0, 3)), false);
        };
        ApiClient client = new ApiClient(fake,
            new ExponentialBackoff(4, 100, 1000, new Random(7)),
            new Timeout(300, 1500), clock);
        script.addAll(List.of("503:20", "slow", "200:30"));
        client.execute(new Request("GET", "/orders/7", null));
        script.addAll(List.of("503:20"));
        client.execute(new Request("POST", "/orders", null));
        script.addAll(List.of("slow", "slow", "slow", "slow"));
        client.execute(new Request("PUT", "/orders/7", null));
    }
}

class ApiClient {
    private final Transport transport;
    private final RetryPolicy policy;
    private final Timeout timeout;
    private final ManualClock clock;

    ApiClient(Transport t, RetryPolicy p, Timeout to, ManualClock c) {
        transport = t; policy = p; timeout = to; clock = c;
    }

    Response execute(Request req) {
        long start = clock.now();
        long deadline = start + timeout.totalMs();
        System.out.println(req.method() + " " + req.path());
        for (int attempt = 1; ; attempt++) {
            long left = deadline - clock.now();
            long budget = Math.min(timeout.perAttemptMs(), left);
            Response res = transport.send(req, budget);
            System.out.printf("  #%d %s at +%dms%n", attempt, res,
                clock.now() - start);
            if (!policy.shouldRetry(req, res, attempt)) return res;
            long wait = policy.delayMs(attempt);
            if (clock.now() + wait >= deadline) {
                System.out.println("  stop: total budget spent");
                return res;
            }
            System.out.println("  wait " + wait + "ms");
            clock.sleep(wait);
        }
    }
}

record ExponentialBackoff(int maxAttempts, long baseMs, long capMs,
                          Random random) implements RetryPolicy {
    public boolean shouldRetry(Request req, Response res, int attempt) {
        return attempt < maxAttempts && res.isTransient()
            && req.safeToRepeat();
    }
    public long delayMs(int attempt) {    // equal jitter: half fixed
        long exp = Math.min(capMs, baseMs << (attempt - 1));
        return exp / 2 + random.nextLong(exp / 2 + 1);
    }
}

record Request(String method, String path, String idempotencyKey) {
    boolean safeToRepeat() {
        return Set.of("GET", "HEAD", "PUT", "DELETE").contains(method)
            || idempotencyKey != null;
    }
}
record Response(int status, boolean timeout) {
    static Response timedOut() { return new Response(0, true); }
    boolean isTransient() {
        return timeout || status == 502 || status == 503 || status == 504;
    }
    public String toString() { return timeout ? "TIMEOUT" : "" + status; }
}
record Timeout(long perAttemptMs, long totalMs) { }
interface Transport { Response send(Request req, long timeoutMs); }
interface RetryPolicy {
    boolean shouldRetry(Request req, Response res, int attempt);
    long delayMs(int attempt);
}
class ManualClock {
    private long now;
    long now() { return now; }
    void sleep(long ms) { now += ms; }
}
