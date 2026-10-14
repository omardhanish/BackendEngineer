import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class TreeLock {
  public static void main(String[] args) throws Exception {
    LockedFs fs = new LockedFs();
    fs.mkdir("a");
    fs.mkdir("b");
    fs.create("a", "x.txt", 100);
    fs.create("b", "y.txt", 200);
    int rounds = 20_000;
    AtomicInteger torn = new AtomicInteger();
    Thread t1 = new Thread(() -> {           // a -> b -> a, many times
      for (int i = 0; i < rounds; i++) {
        fs.move("x.txt", "a", "b");
        fs.move("x.txt", "b", "a");
      }
    });
    Thread t2 = new Thread(() -> {           // the opposite direction
      for (int i = 0; i < rounds; i++) {
        fs.move("y.txt", "b", "a");
        fs.move("y.txt", "a", "b");
      }
    });
    Thread reader = new Thread(() -> {
      for (int i = 0; i < rounds; i++)
        if (fs.du() != 300) torn.incrementAndGet();
    });
    t1.start(); t2.start(); reader.start();
    t1.join(); t2.join(); reader.join();
    System.out.println("reads that saw half a move: " + torn.get());
    System.out.println("a=" + fs.list("a") + " b=" + fs.list("b"));
    try { fs.move("x.txt", "b", "a"); } catch (IllegalStateException e) {
      System.out.println("refused: " + e.getMessage());
    }
  }
}

class LockedFs {                             // one lock for the whole tree
  private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
  private final TreeMap<String, TreeMap<String, Long>> dirs = new TreeMap<>();

  void mkdir(String dir) {
    write(() -> dirs.putIfAbsent(dir, new TreeMap<>()));
  }

  void create(String dir, String name, long size) {
    write(() -> dirs.get(dir).put(name, size));
  }

  void move(String name, String from, String to) {
    write(() -> {
      Long size = dirs.get(from).get(name);  // check and act, both locked
      if (size == null)
        throw new IllegalStateException(name + " not in " + from);
      if (dirs.get(to).containsKey(name))
        throw new IllegalStateException(name + " exists in " + to);
      dirs.get(from).remove(name);
      dirs.get(to).put(name, size);
    });
  }

  long du() {                                // many readers at once
    lock.readLock().lock();
    try {
      long total = 0;
      for (TreeMap<String, Long> d : dirs.values())
        for (long s : d.values()) total += s;
      return total;
    } finally { lock.readLock().unlock(); }
  }

  List<String> list(String dir) {
    lock.readLock().lock();
    try { return new ArrayList<>(dirs.get(dir).keySet()); }
    finally { lock.readLock().unlock(); }
  }

  private void write(Runnable change) {
    lock.writeLock().lock();
    try { change.run(); } finally { lock.writeLock().unlock(); }
  }
}
