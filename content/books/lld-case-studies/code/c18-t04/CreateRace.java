import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.CyclicBarrier;

public class CreateRace {
  public static void main(String[] args) throws Exception {
    UnsafeDir bad = new UnsafeDir();
    boolean[] r = twoThreads(who -> bad.create("report.pdf", who));
    System.out.println("unsafe: A=" + r[0] + " B=" + r[1]
        + " entries=" + bad.children.size());
    SafeDir good = new SafeDir();
    r = twoThreads(who -> good.create("report.pdf", who));
    int wins = (r[0] ? 1 : 0) + (r[1] ? 1 : 0);
    System.out.println("safe:   wins=" + wins
        + " entries=" + good.children.size());
  }

  interface Create { boolean run(String who) throws Exception; }

  static boolean[] twoThreads(Create c) throws Exception {
    boolean[] out = new boolean[2];
    Thread a = new Thread(() -> out[0] = call(c, "A"));
    Thread b = new Thread(() -> out[1] = call(c, "B"));
    a.start(); b.start();
    a.join(); b.join();                       // join before reading out
    return out;
  }

  static boolean call(Create c, String who) {
    try { return c.run(who); } catch (Exception e) { throw new Error(e); }
  }
}

class UnsafeDir {                             // check, then act: a race
  final Map<String, String> children = new TreeMap<>();
  private final CyclicBarrier bothChecked = new CyclicBarrier(2);

  boolean create(String name, String who) throws Exception {
    boolean exists;
    synchronized (this) { exists = children.containsKey(name); }
    if (exists) return false;
    bothChecked.await();                      // force the bad interleaving
    synchronized (this) { children.put(name, who); }
    return true;                              // both threads get here
  }
}

class SafeDir {                               // one atomic step
  final ConcurrentSkipListMap<String, String> children =
      new ConcurrentSkipListMap<>();
  private final CyclicBarrier start = new CyclicBarrier(2);

  boolean create(String name, String who) throws Exception {
    start.await();                            // same contention as above
    return children.putIfAbsent(name, who) == null;
  }
}
