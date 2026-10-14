import java.util.List;
import java.util.Set;

public class Scope {
    public static void main(String[] args) {
        List<Call> calls = List.of(
            new Call("GET", Failure.STATUS_503, false),
            new Call("PUT", Failure.TIMEOUT, false),
            new Call("POST", Failure.STATUS_503, false),
            new Call("POST", Failure.STATUS_503, true),
            new Call("GET", Failure.STATUS_404, false),
            new Call("DELETE", Failure.CONNECT_ERROR, false));
        for (Call c : calls) {
            System.out.println(c.describe());
        }
        for (UseCase uc : UseCase.values()) {
            String tag = uc.inV1 ? "IN " : "OUT";
            System.out.println(tag + " " + uc.actor + ": " + uc.name());
        }
    }
}

enum Failure {
    TIMEOUT(true), CONNECT_ERROR(true), STATUS_503(true),
    STATUS_400(false), STATUS_404(false);

    final boolean isTransient;
    Failure(boolean isTransient) { this.isTransient = isTransient; }
}

record Call(String method, Failure failure, boolean hasIdempotencyKey) {
    static final Set<String> IDEMPOTENT =
        Set.of("GET", "HEAD", "PUT", "DELETE", "OPTIONS");

    boolean safeToRepeat() {
        return IDEMPOTENT.contains(method) || hasIdempotencyKey;
    }
    String describe() {
        boolean retry = failure.isTransient && safeToRepeat();
        return String.format("%-6s %-13s key=%-5s -> %s", method, failure,
            hasIdempotencyKey, retry ? "RETRY" : "FAIL FAST");
    }
}

enum UseCase {
    SEND_REQUEST("Caller", true),
    RETRY_TRANSIENT_FAILURE("ApiClient", true),
    ENFORCE_TIMEOUT_BUDGET("ApiClient", true),
    OPEN_CIRCUIT_WHEN_DOWNSTREAM_FAILS("ApiClient", true),
    CONFIGURE_POLICY_PER_SERVICE("Operator", true),
    CACHE_RESPONSES("Caller", false),
    HEDGE_SLOW_REQUESTS("ApiClient", false),
    SHARE_BREAKER_STATE_ACROSS_HOSTS("Operator", false);

    final String actor;
    final boolean inV1;
    UseCase(String actor, boolean inV1) {
        this.actor = actor;
        this.inV1 = inV1;
    }
}
