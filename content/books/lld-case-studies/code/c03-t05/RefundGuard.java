import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class RefundGuard {
  public static void main(String[] args) throws Exception {
    System.out.println("unsafe refunded: " + race(new UnsafeLedger()));
    System.out.println("CAS refunded: " + race(new CasLedger()));
  }

  // Payment of 50000; two agents each refund 30000 at the same moment.
  static long race(Ledger ledger) throws Exception {
    CyclicBarrier both = new CyclicBarrier(2);
    AtomicInteger accepted = new AtomicInteger();
    Runnable agent = () -> {
      if (ledger.tryRefund(30000, both)) accepted.incrementAndGet();
    };
    Thread a = new Thread(agent), b = new Thread(agent);
    a.start(); b.start(); a.join(); b.join();
    System.out.print("accepted " + accepted.get() + ", ");
    return ledger.refunded();
  }
}

interface Ledger {
  long CAPTURED = 50000;
  boolean tryRefund(long amount, CyclicBarrier both);
  long refunded();
}

class UnsafeLedger implements Ledger {
  private volatile long refunded = 0;
  public boolean tryRefund(long amount, CyclicBarrier both) {
    long seen = refunded;                       // read
    await(both);                                // both read 0
    if (seen + amount > CAPTURED) return false; // check
    synchronized (this) { refunded += amount; } // write
    return true;
  }
  public long refunded() { return refunded; }
  static void await(CyclicBarrier b) {
    try { b.await(); } catch (Exception e) { throw new RuntimeException(e); }
  }
}

class CasLedger implements Ledger {
  private final AtomicLong refunded = new AtomicLong();
  public boolean tryRefund(long amount, CyclicBarrier both) {
    UnsafeLedger.await(both);
    while (true) {
      long seen = refunded.get();
      if (seen + amount > CAPTURED) return false;
      if (refunded.compareAndSet(seen, seen + amount)) return true;
    }                                           // lost the race: re-read
  }
  public long refunded() { return refunded.get(); }
}
