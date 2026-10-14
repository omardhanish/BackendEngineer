import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class StockRace {
  public static void main(String[] args) throws Exception {
    System.out.println("check-then-act: " + race(false));
    System.out.println("compareAndSet:  " + race(true));
  }

  static String race(boolean atomic) throws Exception {
    AtomicInteger available = new AtomicInteger(1);  // the last T-shirt
    CyclicBarrier bothReady = new CyclicBarrier(2);
    AtomicInteger sold = new AtomicInteger();
    List<Thread> buyers = new ArrayList<>();
    for (int i = 0; i < 2; i++) {
      Thread t = new Thread(() -> {
        try {
          if (atomic) {
            bothReady.await();
            if (tryReserve(available, 1)) sold.incrementAndGet();
          } else if (available.get() >= 1) {
            bothReady.await();         // both saw 1 left; now both act
            available.addAndGet(-1);
            sold.incrementAndGet();
          }
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      });
      buyers.add(t);
      t.start();
    }
    for (Thread t : buyers) t.join();
    return "sold " + sold.get() + ", available " + available.get();
  }

  static boolean tryReserve(AtomicInteger available, int qty) {
    while (true) {
      int current = available.get();
      if (current < qty) return false;
      if (available.compareAndSet(current, current - qty)) return true;
    }                                  // CAS failed: someone moved; retry
  }
}
