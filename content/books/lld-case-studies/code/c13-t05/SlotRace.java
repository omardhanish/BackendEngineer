import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public class SlotRace {
  public static void main(String[] args) throws Exception {
    System.out.println("check-then-act: " + race(false));
    System.out.println("per-court lock: " + race(true));
  }

  static String race(boolean locked) throws Exception {
    Map<String, String> owner = new ConcurrentHashMap<>();
    Map<String, ReentrantLock> courtLocks = new ConcurrentHashMap<>();
    CyclicBarrier bothReady = new CyclicBarrier(2);
    AtomicInteger winners = new AtomicInteger(), claimed = new AtomicInteger();
    Map<String, List<String>> wants = new LinkedHashMap<>();
    wants.put("BK-1", List.of("C-1@18", "C-1@19"));   // P-1: 18:00-20:00
    wants.put("BK-2", List.of("C-1@19", "C-1@20"));   // P-2: 19:00-21:00
    List<Thread> threads = new ArrayList<>();
    for (var w : wants.entrySet()) {
      Thread t = new Thread(() -> {
        try {
          if (locked) {
            bothReady.await();
            ReentrantLock lock =
                courtLocks.computeIfAbsent("C-1", k -> new ReentrantLock());
            lock.lock();
            try { reserve(owner, w.getKey(), w.getValue(), winners, claimed); }
            finally { lock.unlock(); }
          } else {
            boolean free = w.getValue().stream().noneMatch(owner::containsKey);
            bothReady.await();          // both have looked; now both act
            if (free) write(owner, w.getKey(), w.getValue(), winners, claimed);
          }
        } catch (Exception e) { throw new RuntimeException(e); }
      });
      threads.add(t);
      t.start();
    }
    for (Thread t : threads) t.join();
    return "winners=" + winners + " hours claimed=" + claimed
        + " hours stored=" + owner.size();
  }

  static void reserve(Map<String, String> owner, String id,
      List<String> hours, AtomicInteger winners, AtomicInteger claimed) {
    if (hours.stream().noneMatch(owner::containsKey))
      write(owner, id, hours, winners, claimed);
  }

  static void write(Map<String, String> owner, String id,
      List<String> hours, AtomicInteger winners, AtomicInteger claimed) {
    for (String h : hours) owner.put(h, id);
    winners.incrementAndGet();
    claimed.addAndGet(hours.size());
  }
}
