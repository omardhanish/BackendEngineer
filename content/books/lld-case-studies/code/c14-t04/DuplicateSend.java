import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class DuplicateSend {
  public static void main(String[] args) throws Exception {
    System.out.println("get-then-put sends: " + race(false));
    System.out.println("putIfAbsent sends:  " + race(true));
  }

  // Two threads deliver the same request "k1" at the same moment.
  static int race(boolean atomic) throws Exception {
    Map<String, String> byKey = new ConcurrentHashMap<>();
    CyclicBarrier together = new CyclicBarrier(2);
    AtomicInteger smsSent = new AtomicInteger();
    List<Thread> workers = new ArrayList<>();
    for (String worker : List.of("W-1", "W-2")) {
      Thread t = new Thread(() -> {
        try {
          if (atomic) {
            together.await();
            if (byKey.putIfAbsent("k1", worker) == null)
              smsSent.incrementAndGet();          // only the winner sends
          } else {
            boolean seen = byKey.get("k1") != null;
            together.await();                     // both have looked
            if (!seen) {
              byKey.put("k1", worker);
              smsSent.incrementAndGet();
            }
          }
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      });
      workers.add(t);
      t.start();
    }
    for (Thread t : workers) t.join();
    return smsSent.get();
  }
}
