import java.util.*;
import java.util.concurrent.*;

public class KeyedDispatch {
  public static void main(String[] args) throws Exception {
    System.out.println("shared pool: " + race(new SharedPool(4)));
    System.out.println("key lanes:   " + race(new KeyLanes(4)));
  }

  // Two events for key O-1. The first handler is slow: it waits up to
  // 500 ms for the second to finish, so any overtaking always shows.
  static List<String> race(Dispatcher d) throws Exception {
    List<String> seen = Collections.synchronizedList(new ArrayList<>());
    CountDownLatch paidDone = new CountDownLatch(1);
    d.submit("O-1", () -> {
      try { paidDone.await(500, TimeUnit.MILLISECONDS); }
      catch (InterruptedException e) { Thread.currentThread().interrupt(); }
      seen.add("placed");
    });
    d.submit("O-1", () -> { seen.add("paid"); paidDone.countDown(); });
    d.close();                          // waits for both handlers
    return seen;
  }
}

interface Dispatcher {
  void submit(String key, Runnable handler);
  void close() throws InterruptedException;
}

class SharedPool implements Dispatcher {   // any free thread takes it
  private final ExecutorService pool;
  SharedPool(int threads) { pool = Executors.newFixedThreadPool(threads); }
  public void submit(String key, Runnable h) { pool.execute(h); }
  public void close() throws InterruptedException {
    pool.shutdown();
    pool.awaitTermination(5, TimeUnit.SECONDS);
  }
}

class KeyLanes implements Dispatcher {     // same key -> same thread
  private final ExecutorService[] lanes;
  KeyLanes(int n) {
    lanes = new ExecutorService[n];
    for (int i = 0; i < n; i++) lanes[i] = Executors.newSingleThreadExecutor();
  }
  public void submit(String key, Runnable h) {
    lanes[Math.floorMod(key.hashCode(), lanes.length)].execute(h);
  }
  public void close() throws InterruptedException {
    for (ExecutorService lane : lanes) lane.shutdown();
    for (ExecutorService lane : lanes)
      lane.awaitTermination(5, TimeUnit.SECONDS);
  }
}
