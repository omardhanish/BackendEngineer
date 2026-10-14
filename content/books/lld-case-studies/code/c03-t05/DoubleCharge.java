import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class DoubleCharge {
  public static void main(String[] args) throws Exception {
    System.out.println("check-then-act charges: " + race(false));
    System.out.println("putIfAbsent charges: " + race(true));
    // Edge case: the winner's charge times out.
    Service svc = new Service();
    System.out.println("first try: " + svc.pay("k-9", true));
    System.out.println("retry same key: " + svc.pay("k-9", false));
    svc.reconcile("k-9", "SUCCEEDED");          // ask gateway later
    System.out.println("after reconcile: " + svc.pay("k-9", false)
        + ", charges " + svc.charges.get());
  }

  static int race(boolean safe) throws Exception {
    Service svc = new Service();
    CyclicBarrier both = new CyclicBarrier(2);
    Runnable click = () -> svc.payRacing("k-1", safe, both);
    Thread a = new Thread(click), b = new Thread(click);
    a.start(); b.start(); a.join(); b.join();
    return svc.charges.get();
  }
}

class Service {
  final ConcurrentHashMap<String, String> byKey = new ConcurrentHashMap<>();
  final AtomicInteger charges = new AtomicInteger();

  void payRacing(String key, boolean safe, CyclicBarrier both) {
    try {
      if (safe) {
        both.await();                           // both arrive together
        if (byKey.putIfAbsent(key, "PROCESSING") != null) return;
      } else {
        boolean seen = byKey.containsKey(key);
        both.await();                           // both checked: none seen
        if (seen) return;
        byKey.put(key, "PROCESSING");
      }
      charges.incrementAndGet();                // the gateway call
      byKey.put(key, "SUCCEEDED");
    } catch (Exception e) { throw new RuntimeException(e); }
  }

  String pay(String key, boolean gatewayTimesOut) {
    String prev = byKey.putIfAbsent(key, "PROCESSING");
    if (prev != null) return prev;              // replay: no new charge
    charges.incrementAndGet();
    if (gatewayTimesOut) return "PROCESSING";   // unknown, not FAILED
    byKey.put(key, "SUCCEEDED");
    return "SUCCEEDED";
  }

  void reconcile(String key, String gatewayAnswer) {
    byKey.replace(key, "PROCESSING", gatewayAnswer);
  }
}
