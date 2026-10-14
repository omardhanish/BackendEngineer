import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class AsyncAppender {
  public static void main(String[] args) throws Exception {
    List<String> disk = new ArrayList<>();       // only the worker touches it
    Async a = new Async(1000, disk::add);
    Thread[] producers = new Thread[3];
    for (int p = 0; p < 3; p++) {
      String who = "P" + p;
      producers[p] = new Thread(() -> {
        for (int i = 0; i < 200; i++) a.append(who + ":" + i);
      });
      producers[p].start();
    }
    for (Thread t : producers) t.join();
    a.close();                                   // drains, then stops
    System.out.println("written " + disk.size() + ", dropped " + a.dropped());
    System.out.println("per-thread order kept: " + ordered(disk));
    System.out.println("after close accepted: " + a.append("late"));

    CountDownLatch busy = new CountDownLatch(1), gate = new CountDownLatch(1);
    Async slow = new Async(2, s -> {             // a stalled disk
      busy.countDown();
      try { gate.await(); } catch (InterruptedException e) { }
    });
    slow.append("r1");
    busy.await();                                // worker is stuck on r1
    for (String r : List.of("r2", "r3", "r4", "r5")) slow.append(r);
    System.out.println("stalled disk dropped " + slow.dropped());
    gate.countDown();
    slow.close();
  }

  static boolean ordered(List<String> lines) {
    Map<String, Integer> last = new HashMap<>();
    for (String l : lines) {
      String[] p = l.split(":");
      int n = Integer.parseInt(p[1]);
      if (last.getOrDefault(p[0], -1) >= n) return false;
      last.put(p[0], n);
    }
    return true;
  }
}

interface Sink { void write(String line); }

class Async {
  private static final String STOP = new String("STOP"); // unique marker
  private final BlockingQueue<String> queue;
  private final AtomicInteger dropped = new AtomicInteger();
  private volatile boolean closed;
  private final Thread worker;

  Async(int capacity, Sink target) {
    queue = new ArrayBlockingQueue<>(capacity);
    worker = new Thread(() -> {
      try {
        for (String s = queue.take(); s != STOP; s = queue.take()) {
          target.write(s);                       // one writer: no torn lines
        }
      } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }, "log-writer");
    worker.start();
  }

  boolean append(String line) {                  // never blocks the caller
    if (closed) return false;
    if (queue.offer(line)) return true;
    dropped.incrementAndGet();
    return false;
  }

  int dropped() { return dropped.get(); }

  void close() throws InterruptedException {
    closed = true;
    queue.put(STOP);                             // after every queued line
    worker.join();
  }
}
