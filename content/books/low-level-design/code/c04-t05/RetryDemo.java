import java.util.function.Supplier;

public class RetryDemo {
    public static void main(String[] args) {
        Supplier<String> cached = () -> "cached 1.10";
        RateService wobbly = new RateService(2);    // fails twice
        System.out.println(Retry.call(wobbly::rate, 3, cached));
        RateService down = new RateService(9);      // stays down
        System.out.println(Retry.call(down::rate, 3, cached));
    }
}

class RateService {                     // a remote call that may fail
    private int failuresLeft;

    RateService(int failures) { this.failuresLeft = failures; }

    String rate() {
        if (failuresLeft-- > 0) throw new RemoteTimeoutException("timeout");
        return "live 1.12";
    }
}

class RemoteTimeoutException extends RuntimeException {
    RemoteTimeoutException(String m) { super(m); }
}

class Retry {
    static <T> T call(Supplier<T> op, int attempts, Supplier<T> fallback) {
        for (int i = 1; i <= attempts; i++) {
            try {
                T result = op.get();
                System.out.println("attempt " + i + " ok");
                return result;
            } catch (RemoteTimeoutException e) {
                System.out.println("attempt " + i + ": " + e.getMessage());
                // real code: sleep with exponential backoff + jitter here
            }
        }
        System.out.println("giving up, using fallback");
        return fallback.get();
    }
}
