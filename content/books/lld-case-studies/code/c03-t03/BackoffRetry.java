import java.util.*;

public class BackoffRetry {
  public static void main(String[] args) {
    List<Long> waits = new ArrayList<>();
    RetryPolicy policy = new ExponentialBackoff(4, 200, waits::add);
    GatewayResult[] script = { GatewayResult.TIMEOUT,
        GatewayResult.TIMEOUT, GatewayResult.TIMEOUT,
        GatewayResult.APPROVED };
    int attempt = 0;
    GatewayResult r;
    do {
      r = script[attempt++];
      System.out.println("attempt " + attempt + ": " + r);
    } while (policy.shouldRetry(attempt, r));
    System.out.println("waited (ms): " + waits);
    System.out.println("retry a decline? "
        + policy.shouldRetry(1, GatewayResult.DECLINED));
  }
}

enum GatewayResult { APPROVED, DECLINED, TIMEOUT }
interface RetryPolicy { boolean shouldRetry(int attempt, GatewayResult r); }
interface Sleeper { void sleep(long millis); }

// A new policy class. PaymentService and FixedRetry are not edited.
class ExponentialBackoff implements RetryPolicy {
  private final int maxAttempts;
  private final long baseMillis;
  private final Sleeper sleeper;
  ExponentialBackoff(int maxAttempts, long baseMillis, Sleeper sleeper) {
    this.maxAttempts = maxAttempts;
    this.baseMillis = baseMillis; this.sleeper = sleeper;
  }
  public boolean shouldRetry(int attempt, GatewayResult r) {
    if (r != GatewayResult.TIMEOUT || attempt >= maxAttempts) return false;
    sleeper.sleep(baseMillis << (attempt - 1));   // 200, 400, 800 ...
    return true;
  }
}
