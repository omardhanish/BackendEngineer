import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class NightRace {
  static final int ROOMS = 1;                  // one Deluxe room left

  public static void main(String[] args) throws Exception {
    run(false);
    run(true);
  }

  static void run(boolean safe) throws Exception {
    Map<String, AtomicInteger> taken = new TreeMap<>();
    for (String n : List.of("13", "14", "15"))
      taken.put(n, new AtomicInteger());
    CyclicBarrier together = new CyclicBarrier(2);
    AtomicInteger winners = new AtomicInteger();
    Thread a = new Thread(() -> book(taken, List.of("13", "14"),
        together, winners, safe));
    Thread b = new Thread(() -> book(taken, List.of("14", "15"),
        together, winners, safe));
    a.start(); b.start(); a.join(); b.join();
    System.out.println((safe ? "per-night CAS" : "check-then-act")
        + ": winners " + winners + ", night 14 taken "
        + taken.get("14") + " of " + ROOMS);
  }

  static void book(Map<String, AtomicInteger> taken, List<String> nights,
      CyclicBarrier together, AtomicInteger winners, boolean safe) {
    try {
      if (safe) {
        together.await();                      // start at the same time
        if (takeAll(taken, nights)) winners.incrementAndGet();
        return;
      }
      boolean allFree = true;
      for (String n : nights)
        if (taken.get(n).get() >= ROOMS) allFree = false;
      together.await();                        // both have checked
      if (!allFree) return;
      for (String n : nights) taken.get(n).incrementAndGet();
      winners.incrementAndGet();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  // Take nights in sorted order; on any failure give back what was taken.
  static boolean takeAll(Map<String, AtomicInteger> taken,
      List<String> nights) {
    List<String> got = new ArrayList<>();
    for (String n : new TreeSet<>(nights)) {
      if (!tryTake(taken.get(n))) {
        for (String g : got) taken.get(g).decrementAndGet();
        return false;
      }
      got.add(n);
    }
    return true;
  }

  static boolean tryTake(AtomicInteger count) {
    while (true) {
      int now = count.get();
      if (now >= ROOMS) return false;
      if (count.compareAndSet(now, now + 1)) return true;
    }
  }
}
