import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public class RoomRace {
  public static void main(String[] args) throws Exception {
    System.out.println("unsafe winners: " + race(false));
    System.out.println("locked winners: " + race(true));
  }

  static int race(boolean safe) throws Exception {
    RoomCalendars cals = new RoomCalendars();
    CyclicBarrier bothReady = new CyclicBarrier(2);
    AtomicInteger wins = new AtomicInteger();
    Runnable asha = () -> attempt(cals, safe, bothReady, wins, 600, 660);
    Runnable ravi = () -> attempt(cals, safe, bothReady, wins, 630, 690);
    Thread t1 = new Thread(asha), t2 = new Thread(ravi);
    t1.start(); t2.start(); t1.join(); t2.join();
    return wins.get();
  }

  static void attempt(RoomCalendars cals, boolean safe, CyclicBarrier b,
      AtomicInteger wins, int start, int end) {
    try {
      boolean ok = safe ? cals.bookLocked("R-1", start, end, b)
          : cals.bookUnsafe("R-1", start, end, b);
      if (ok) wins.incrementAndGet();
    } catch (Exception e) { throw new RuntimeException(e); }
  }
}

class RoomCalendars {
  // minutes since midnight, [start, end) per booking, per room
  private final ConcurrentHashMap<String, List<int[]>> byRoom =
      new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, ReentrantLock> locks =
      new ConcurrentHashMap<>();

  private List<int[]> cal(String room) {
    return byRoom.computeIfAbsent(room, k -> new ArrayList<>());
  }
  private boolean isFree(String room, int s, int e) {
    return cal(room).stream().noneMatch(iv -> s < iv[1] && iv[0] < e);
  }

  boolean bookUnsafe(String room, int s, int e, CyclicBarrier b)
      throws Exception {
    boolean free = isFree(room, s, e);   // check ...
    b.await();                           // ... both threads look first
    if (!free) return false;
    synchronized (this) { cal(room).add(new int[] {s, e}); } // ... act
    return true;
  }

  boolean bookLocked(String room, int s, int e, CyclicBarrier b)
      throws Exception {
    b.await();                           // both arrive together
    ReentrantLock lock = locks.computeIfAbsent(room,
        k -> new ReentrantLock());       // one lock per room
    lock.lock();
    try {
      if (!isFree(room, s, e)) return false;   // check and act
      cal(room).add(new int[] {s, e});         // under one lock
      return true;
    } finally { lock.unlock(); }
  }
}
