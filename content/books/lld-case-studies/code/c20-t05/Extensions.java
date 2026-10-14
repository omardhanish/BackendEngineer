import java.util.*;

public class Extensions {
  public static void main(String[] args) {
    SubscriptionOptions opts = SubscriptionOptions.builder()
        .retry(new ExponentialBackoff(6, 100, 1000)).dedupIds(1000).build();
    System.out.println(opts);
    System.out.println("delays: " + schedule(opts.retry()));

    Counting billing = new Counting(
        new Deduplicating(new Charge(), opts.dedupIds()));
    List<Long> waits = new ArrayList<>();
    Event e1 = new Event("EV-1", "O-1"), e2 = new Event("EV-2", "O-2");
    deliver(billing, e1, opts.retry(), waits);
    deliver(billing, e1, opts.retry(), waits);   // broker redelivers
    deliver(billing, e2, opts.retry(), waits);   // fails twice first
    System.out.println("waited " + waits + " ms; " + billing.stats());

    try {
      SubscriptionOptions.builder().lanes(0).build();
    } catch (IllegalArgumentException ex) {
      System.out.println("refused: " + ex.getMessage());
    }
  }

  // Core delivery loop: written once, never edited for a new policy.
  static void deliver(Subscriber s, Event e, RetryPolicy p, List<Long> w) {
    for (int attempt = 1; ; attempt++) {
      try { s.onEvent(e); return; }
      catch (Exception ex) {
        if (attempt >= p.maxAttempts()) return;   // to dead letters
        w.add(p.delayMs(attempt));                // a real bus sleeps here
      }
    }
  }
  static List<Long> schedule(RetryPolicy p) {
    List<Long> out = new ArrayList<>();
    for (int a = 1; a < p.maxAttempts(); a++) out.add(p.delayMs(a));
    return out;
  }
}

record Event(String id, String key) {}

interface Subscriber { void onEvent(Event e) throws Exception; }

interface RetryPolicy {                 // strategy
  int maxAttempts();
  long delayMs(int failedAttempts);
}
record FixedDelay(int maxAttempts, long ms) implements RetryPolicy {
  public long delayMs(int failed) { return ms; }
}
record ExponentialBackoff(int maxAttempts, long baseMs, long capMs)
    implements RetryPolicy {
  public long delayMs(int failed) {
    return Math.min(capMs, baseMs << Math.min(failed - 1, 30));
  }
}

class Charge implements Subscriber {    // fails twice on O-2
  private int o2Calls;
  public void onEvent(Event e) {
    if (e.key().equals("O-2") && ++o2Calls <= 2)
      throw new IllegalStateException("gateway timeout");
    System.out.println("charged " + e.key());
  }
}

class Deduplicating implements Subscriber {   // decorator
  private final Subscriber inner;
  private final Set<String> seen;
  Deduplicating(Subscriber inner, int window) {
    this.inner = inner;
    this.seen = Collections.newSetFromMap(new LinkedHashMap<>() {
      @Override protected boolean removeEldestEntry(Map.Entry<String,
          Boolean> eldest) { return size() > window; }
    });
  }
  public void onEvent(Event e) throws Exception {
    if (seen.contains(e.id())) return;   // duplicate: already handled
    inner.onEvent(e);                    // a throw leaves it unmarked
    seen.add(e.id());
  }
}

class Counting implements Subscriber {        // decorator
  private final Subscriber inner;
  private int calls, failures;
  Counting(Subscriber inner) { this.inner = inner; }
  public void onEvent(Event e) throws Exception {
    calls++;
    try { inner.onEvent(e); }
    catch (Exception ex) { failures++; throw ex; }
  }
  String stats() { return "calls=" + calls + " failures=" + failures; }
}

record SubscriptionOptions(RetryPolicy retry, int lanes, int dedupIds) {
  static Builder builder() { return new Builder(); }

  static class Builder {                      // defaults live here
    private RetryPolicy retry = new FixedDelay(3, 500);
    private int lanes = 1, dedupIds = 10_000;
    Builder retry(RetryPolicy r) {
      retry = Objects.requireNonNull(r);
      return this;
    }
    Builder lanes(int n) { lanes = n; return this; }
    Builder dedupIds(int n) { dedupIds = n; return this; }
    SubscriptionOptions build() {
      if (lanes < 1) throw new IllegalArgumentException("lanes must be >= 1");
      if (dedupIds < 1) throw new IllegalArgumentException("dedupIds");
      return new SubscriptionOptions(retry, lanes, dedupIds);
    }
  }
}
