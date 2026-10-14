import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class SeatRace {
  public static void main(String[] args) throws Exception {
    System.out.println("check-then-act winners: " + race(false));
    System.out.println("putIfAbsent winners:    " + race(true));
  }

  static int race(boolean atomic) throws Exception {
    Map<String, String> owner = new ConcurrentHashMap<>();
    CyclicBarrier bothReady = new CyclicBarrier(2);
    AtomicInteger winners = new AtomicInteger();
    List<Thread> users = new ArrayList<>();
    for (String user : List.of("U-7", "U-9")) {
      Thread t = new Thread(() -> {
        try {
          if (atomic) {
            bothReady.await();
            if (owner.putIfAbsent("SH-1/A1", user) == null)
              winners.incrementAndGet();
          } else {
            boolean free = !owner.containsKey("SH-1/A1");
            bothReady.await(); // both have looked; now both act
            if (free) {
              owner.put("SH-1/A1", user);
              winners.incrementAndGet();
            }
          }
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      });
      users.add(t);
      t.start();
    }
    for (Thread t : users) t.join();
    return winners.get();
  }
}
