import java.util.ArrayDeque;
import java.util.List;
import java.util.Set;

public class ClassDesign {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock();
        var script = new ArrayDeque<>(List.of(503, 503, 200));
        Transport fake = (req, timeoutMs) -> {
            clock.sleep(40);                      // the call takes 40 ms
            return new Response(script.poll());
        };
        ApiClient client = new ApiClient(fake, new FixedDelayRetry(3, 250),
            new Timeout(500, 3000), new AlwaysClosed(), clock);
        Response r = client.execute(new Request("GET", "/users/42", null));
        System.out.println("result " + r + " at t=" + clock.now());
    }
}

record Request(String method, String path, String idempotencyKey) {
    boolean safeToRepeat() {
        return Set.of("GET", "HEAD", "PUT", "DELETE").contains(method)
            || idempotencyKey != null;
    }
}

record Response(int status) {
    boolean isTransient() { return status == 503 || status == 504; }
}

record Timeout(long perAttemptMs, long totalMs) {
    Timeout {
        if (perAttemptMs <= 0 || totalMs < perAttemptMs) {
            throw new IllegalArgumentException("bad timeout");
        }
    }
}

interface Transport { Response send(Request req, long timeoutMs); }
interface Sleeper { void sleep(long ms); }

interface RetryPolicy {
    boolean shouldRetry(Request req, Response res, int attempt);
    long delayMs(int attempt);
}

interface CircuitBreaker {
    boolean allowRequest();
    void onSuccess();
    void onFailure();
}

class ApiClient {
    private final Transport transport;
    private final RetryPolicy policy;
    private final Timeout timeout;
    private final CircuitBreaker breaker;
    private final Sleeper sleeper;

    ApiClient(Transport t, RetryPolicy p, Timeout to, CircuitBreaker b,
              Sleeper s) {
        transport = t; policy = p; timeout = to; breaker = b; sleeper = s;
    }

    Response execute(Request req) {
        for (int attempt = 1; ; attempt++) {
            if (!breaker.allowRequest()) return new Response(503);
            Response res = transport.send(req, timeout.perAttemptMs());
            System.out.println("attempt " + attempt + " -> " + res.status());
            if (res.isTransient()) breaker.onFailure();
            else breaker.onSuccess();
            if (!policy.shouldRetry(req, res, attempt)) return res;
            sleeper.sleep(policy.delayMs(attempt));
        }
    }
}

record FixedDelayRetry(int maxAttempts, long delay) implements RetryPolicy {
    public boolean shouldRetry(Request req, Response res, int attempt) {
        return attempt < maxAttempts && res.isTransient()
            && req.safeToRepeat();
    }
    public long delayMs(int attempt) { return delay; }
}

class AlwaysClosed implements CircuitBreaker {   // the real one: next page
    public boolean allowRequest() { return true; }
    public void onSuccess() { }
    public void onFailure() { }
}

class ManualClock implements Sleeper {           // time moves only on sleep
    private long now;
    long now() { return now; }
    public void sleep(long ms) { now += ms; }
}
