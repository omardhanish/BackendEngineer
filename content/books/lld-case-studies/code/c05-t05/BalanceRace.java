import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class BalanceRace {
  public static void main(String[] args) throws Exception {
    System.out.println("check-then-debit: " + race(false));
    System.out.println("compare-and-set:  " + race(true));
  }

  // Two ATMs withdraw 80000 from one joint account holding 100000.
  static String race(boolean safe) throws Exception {
    AtomicLong balance = new AtomicLong(100_000);
    CyclicBarrier bothReady = new CyclicBarrier(2);
    AtomicInteger approved = new AtomicInteger();
    List<Thread> atms = new ArrayList<>();
    for (int i = 0; i < 2; i++) {
      Thread t = new Thread(() -> {
        try {
          if (safe) {
            bothReady.await();
            if (debit(balance, 80_000)) approved.incrementAndGet();
          } else {
            boolean enough = balance.get() >= 80_000;
            bothReady.await();          // both have checked; now both act
            if (enough) {
              balance.addAndGet(-80_000);
              approved.incrementAndGet();
            }
          }
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      });
      atms.add(t);
      t.start();
    }
    for (Thread t : atms) t.join();
    return "approved " + approved + ", balance " + balance;
  }

  // Read, check, then write only if nobody changed the value meanwhile.
  static boolean debit(AtomicLong balance, long amount) {
    while (true) {
      long seen = balance.get();
      if (seen < amount) return false;
      if (balance.compareAndSet(seen, seen - amount)) return true;
    }
  }
}
