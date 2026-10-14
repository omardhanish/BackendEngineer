import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Stampede {
  public static void main(String[] args) throws Exception {
    System.out.println("get-then-load DB loads:   " + race(false));
    System.out.println("computeIfAbsent DB loads: " + race(true));
  }

  static int race(boolean singleFlight) throws Exception {
    AtomicInteger dbLoads = new AtomicInteger();
    Map<String, String> plain = new ConcurrentHashMap<>();
    Map<String, CompletableFuture<String>> inflight =
        new ConcurrentHashMap<>();
    CyclicBarrier together = new CyclicBarrier(4);
    List<Thread> readers = new ArrayList<>();
    for (int i = 0; i < 4; i++) {
      Thread t = new Thread(() -> {
        try {
          if (singleFlight) {
            together.await();
            inflight.computeIfAbsent("user:42",
                k -> CompletableFuture.supplyAsync(() -> {
                  dbLoads.incrementAndGet();
                  return "Asha";
                })).join();
          } else {
            boolean miss = plain.get("user:42") == null;
            together.await();          // all four looked; all four missed
            if (miss) {
              dbLoads.incrementAndGet();
              plain.put("user:42", "Asha");
            }
          }
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      });
      readers.add(t);
      t.start();
    }
    for (Thread t : readers) t.join();
    return dbLoads.get();
  }
}
