import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class LastSeatRace {
  public static void main(String[] args) throws Exception {
    System.out.println("read-then-write: " + race(false));
    System.out.println("compareAndSet:   " + race(true));
  }

  // One seat left in Y-SAVER; two travellers ask for it at once.
  static String race(boolean atomic) throws Exception {
    AtomicInteger left = new AtomicInteger(1);
    AtomicInteger sold = new AtomicInteger();
    CyclicBarrier bothReady = new CyclicBarrier(2);
    List<Thread> threads = new ArrayList<>();
    for (int i = 0; i < 2; i++) {
      Thread t = new Thread(() -> {
        try {
          if (atomic) {
            bothReady.await();
            if (reserve(left, 1)) sold.incrementAndGet();
          } else {
            int seen = left.get();
            bothReady.await();          // both have read 1; now both write
            if (seen >= 1) {
              left.set(seen - 1);
              sold.incrementAndGet();
            }
          }
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      });
      threads.add(t);
      t.start();
    }
    for (Thread t : threads) t.join();
    return "sold " + sold.get() + ", count left " + left.get();
  }

  static boolean reserve(AtomicInteger left, int n) {
    while (true) {
      int cur = left.get();
      if (cur < n) return false;
      if (left.compareAndSet(cur, cur - n)) return true;
    }
  }
}
