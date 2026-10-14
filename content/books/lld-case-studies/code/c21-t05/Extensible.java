import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicInteger;

public class Extensible {
    public static void main(String[] args) {
        var script = new ArrayDeque<>(List.of(
            new Response(429, 2000), new Response(200, 0)));
        Transport fake = req -> script.poll();
        ApiClient payments = ApiClient.builder("payments")
            .transport(fake)
            .intercept(new RequestId())
            .intercept(new Logging())
            .retry(new RetryAfterPolicy(new Backoff(3, 100), 5000))
            .build();
        Response r = payments.execute(new Request("GET", "/charges/9"));
        System.out.println("final " + r.status());
        try {
            ApiClient.builder("search").transport(fake).build();
        } catch (IllegalStateException e) {
            System.out.println("rejected config: " + e.getMessage());
        }
    }
}

record Request(String method, String path, Map<String, String> headers) {
    Request(String method, String path) { this(method, path, Map.of()); }
    Request withHeader(String name, String value) {
        var copy = new TreeMap<>(headers);    // sorted: stable output
        copy.put(name, value);
        return new Request(method, path, copy);
    }
    boolean safeToRepeat() {
        return Set.of("GET", "PUT", "DELETE").contains(method)
            || headers.containsKey("Idempotency-Key");
    }
}
record Response(int status, long retryAfterMs) { }
interface Transport { Response send(Request req); }
interface Interceptor { Response intercept(Request req, Transport next); }
interface RetryPolicy {
    boolean shouldRetry(Request req, Response res, int attempt);
    long delayMs(Response res, int attempt);
}

class ApiClient {
    private final Transport chain;
    private final RetryPolicy policy;
    private ApiClient(Transport chain, RetryPolicy policy) {
        this.chain = chain; this.policy = policy;
    }
    static Builder builder(String service) { return new Builder(service); }

    Response execute(Request req) {
        for (int attempt = 1; ; attempt++) {
            Response res = chain.send(req);
            if (!policy.shouldRetry(req, res, attempt)) return res;
            System.out.println("  wait " + policy.delayMs(res, attempt) + "ms");
        }
    }

    static class Builder {
        private final String service;
        private final List<Interceptor> interceptors = new ArrayList<>();
        private Transport transport;
        private RetryPolicy policy;
        Builder(String service) { this.service = service; }
        Builder transport(Transport t) { transport = t; return this; }
        Builder intercept(Interceptor i) { interceptors.add(i); return this; }
        Builder retry(RetryPolicy p) { policy = p; return this; }

        ApiClient build() {
            if (policy == null) {
                throw new IllegalStateException(service + ": no retry policy");
            }
            Transport t = transport;              // wrap inside-out, so the
            for (int i = interceptors.size() - 1; i >= 0; i--) {
                Interceptor in = interceptors.get(i);  // first added runs
                Transport next = t;                    // first
                t = req -> in.intercept(req, next);
            }
            return new ApiClient(t, policy);
        }
    }
}

record Backoff(int maxAttempts, long baseMs) implements RetryPolicy {
    public boolean shouldRetry(Request req, Response res, int attempt) {
        return req.safeToRepeat() && attempt < maxAttempts
            && res.status() >= 502 && res.status() <= 504;
    }
    public long delayMs(Response res, int attempt) {
        return baseMs << (attempt - 1);
    }
}

record RetryAfterPolicy(RetryPolicy inner, long maxHintMs)
        implements RetryPolicy {
    public boolean shouldRetry(Request req, Response res, int attempt) {
        if (res.status() == 429) return inner.shouldRetry(
            req, new Response(503, 0), attempt);  // same attempt budget
        return inner.shouldRetry(req, res, attempt);
    }
    public long delayMs(Response res, int attempt) {
        long hint = Math.min(res.retryAfterMs(), maxHintMs);  // capped
        return hint > 0 ? hint : inner.delayMs(res, attempt);
    }
}

class RequestId implements Interceptor {
    private final AtomicInteger next = new AtomicInteger(1);
    public Response intercept(Request req, Transport chain) {
        String id = "req-" + next.getAndIncrement();
        return chain.send(req.withHeader("X-Request-Id", id));
    }
}

class Logging implements Interceptor {
    public Response intercept(Request req, Transport chain) {
        Response res = chain.send(req);
        System.out.println(req.method() + " " + req.path() + " "
            + req.headers() + " -> " + res.status());
        return res;
    }
}
