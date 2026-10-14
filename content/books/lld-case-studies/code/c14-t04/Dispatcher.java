import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class Dispatcher {
  public static void main(String[] args) throws Exception {
    FlakySms a = new FlakySms("sms-a", 3), b = new FlakySms("sms-b", 0);
    SafeService svc = new SafeService(List.of(a, b));
    ExecutorService pool = new ThreadPoolExecutor(4, 4, 0,
        TimeUnit.SECONDS, new ArrayBlockingQueue<>(20),
        new ThreadPoolExecutor.CallerRunsPolicy());   // backpressure
    for (int i = 0; i < 200; i++) {
      String key = "k" + (i % 150);                    // 50 duplicates
      pool.execute(() -> svc.send(key));
    }
    pool.shutdown();
    if (!pool.awaitTermination(10, TimeUnit.SECONDS))
      throw new IllegalStateException("timeout");
    System.out.println("notifications: " + svc.count());
    System.out.println("sent: " + svc.sent.get());
    System.out.println(a.name + " calls=" + a.calls + " ok=" + a.ok);
    System.out.println(b.name + " calls=" + b.calls + " ok=" + b.ok);
  }
}

class SafeService {
  private final List<Provider> providers;          // immutable list
  private final ConcurrentMap<String, String> byKey =
      new ConcurrentHashMap<>();
  private final AtomicLong seq = new AtomicLong();
  final AtomicInteger sent = new AtomicInteger();

  SafeService(List<Provider> providers) {
    this.providers = List.copyOf(providers);
  }

  void send(String key) {
    String id = "N-" + seq.incrementAndGet();      // gaps are fine
    if (byKey.putIfAbsent(key, id) != null) return;   // duplicate
    for (Provider p : providers) {                     // no lock held
      if (p.send(key)) { sent.incrementAndGet(); return; }
    }
  }

  int count() { return byKey.size(); }
}

interface Provider { boolean send(String key); }

class FlakySms implements Provider {
  final String name;
  private final int failEvery;
  final AtomicInteger calls = new AtomicInteger(), ok = new AtomicInteger();

  FlakySms(String name, int failEvery) {
    this.name = name;
    this.failEvery = failEvery;
  }

  public boolean send(String key) {
    int n = calls.incrementAndGet();
    if (failEvery > 0 && n % failEvery == 0) return false;
    ok.incrementAndGet();
    return true;
  }
}
