import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class LockedLru {
  public static void main(String[] args) throws Exception {
    SafeLru<Integer, String> cache = new SafeLru<>(5);
    AtomicLong ops = new AtomicLong(), wrong = new AtomicLong();
    List<Thread> workers = new ArrayList<>();
    for (int w = 0; w < 4; w++) {
      int seed = w;
      Thread t = new Thread(() -> {
        for (int i = 0; i < 25_000; i++) {
          int key = (i * 7 + seed) % 10;
          Optional<String> v = cache.get(key);
          if (v.isEmpty()) cache.put(key, "v" + key);    // miss: load
          else if (!v.get().equals("v" + key)) wrong.incrementAndGet();
          ops.incrementAndGet();
        }
      });
      workers.add(t);
      t.start();
    }
    for (Thread t : workers) t.join();
    System.out.println("ops = " + ops.get() + ", wrong values = " + wrong);
    System.out.println("size = " + cache.size() + " (capacity 5)");
  }
}

class SafeLru<K, V> {
  private final ReentrantLock lock = new ReentrantLock();
  private final LinkedHashMap<K, V> map;

  SafeLru(int capacity) {
    map = new LinkedHashMap<>(16, 0.75f, true) {
      @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) {
        return size() > capacity;
      }
    };
  }
  Optional<V> get(K key) {              // a read moves the key: lock it too
    lock.lock();
    try { return Optional.ofNullable(map.get(key)); }
    finally { lock.unlock(); }
  }
  void put(K key, V value) {
    lock.lock();
    try { map.put(key, value); }
    finally { lock.unlock(); }
  }
  int size() {
    lock.lock();
    try { return map.size(); }
    finally { lock.unlock(); }
  }
}
