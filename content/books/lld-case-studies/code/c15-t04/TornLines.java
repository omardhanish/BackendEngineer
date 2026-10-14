import java.util.concurrent.CyclicBarrier;
import java.util.regex.Pattern;

public class TornLines {
  static final Pattern LINE = Pattern.compile("\\[(T-\\w)\\] msg from \\1");

  public static void main(String[] args) throws Exception {
    StringBuffer out = new StringBuffer();     // each call is thread-safe
    CyclicBarrier bothStarted = new CyclicBarrier(2);
    run(2, 1, name -> {                        // unsafe: two writes per line
      out.append("[" + name + "] ");
      bothStarted.await();                     // force the bad interleaving
      out.append("msg from " + name + "\n");
    });
    System.out.println("two-write appender: " + good(out) + " of 2 ok");

    StringBuffer safe = new StringBuffer();
    Object lock = new Object();                // only unsafe streams need it
    run(4, 1000, name -> {                     // safe: format, then one write
      String line = "[" + name + "] msg from " + name + "\n";
      synchronized (lock) { safe.append(line); }
    });
    System.out.println("one-write appender: " + good(safe) + " of 4000 ok");
  }

  interface Write { void line(String thread) throws Exception; }

  static void run(int threads, int each, Write w) throws Exception {
    Thread[] ts = new Thread[threads];
    for (int i = 0; i < threads; i++) {
      String name = "T-" + (char) ('A' + i);
      ts[i] = new Thread(() -> {
        try { for (int k = 0; k < each; k++) w.line(name); }
        catch (Exception e) { throw new RuntimeException(e); }
      });
      ts[i].start();
    }
    for (Thread t : ts) t.join();              // join before reading
  }

  static long good(StringBuffer b) {
    return b.toString().lines().filter(l -> LINE.matcher(l).matches()).count();
  }
}
