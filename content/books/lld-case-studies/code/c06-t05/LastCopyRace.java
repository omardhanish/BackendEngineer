import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class LastCopyRace {
  public static void main(String[] args) throws Exception {
    System.out.println("check-then-act loans: " + copyRace(false));
    System.out.println("atomic replace loans: " + copyRace(true));
    System.out.println("member at 4, two borrows, safe: " + limitRace());
  }

  // Two members borrow the last copy CP-7 at the same moment.
  static int copyRace(boolean atomic) throws Exception {
    Map<String, String> status = new ConcurrentHashMap<>();
    status.put("CP-7", "AVAILABLE");
    CyclicBarrier together = new CyclicBarrier(2);
    AtomicInteger loans = new AtomicInteger();
    Runnable borrow = () -> {
      try {
        if (atomic) {
          together.await();
          if (status.replace("CP-7", "AVAILABLE", "ON_LOAN"))
            loans.incrementAndGet();      // only one replace succeeds
        } else {
          boolean free = status.get("CP-7").equals("AVAILABLE");
          together.await();               // both looked, none wrote
          if (free) { status.put("CP-7", "ON_LOAN");
            loans.incrementAndGet(); }
        }
      } catch (Exception e) { throw new RuntimeException(e); }
    };
    runTwice(borrow);
    return loans.get();
  }

  // The loan limit (5) is per member: lock the member, not the library.
  static int limitRace() throws Exception {
    Member m = new Member(4);
    runTwice(() -> m.tryAddLoan(5));
    return m.openLoans();
  }

  static void runTwice(Runnable r) throws Exception {
    Thread a = new Thread(r), b = new Thread(r);
    a.start(); b.start();
    a.join(); b.join();                   // join before reading results
  }
}

class Member {
  private int openLoans;
  Member(int openLoans) { this.openLoans = openLoans; }
  synchronized boolean tryAddLoan(int max) {   // check and add as one step
    if (openLoans >= max) return false;
    openLoans++;
    return true;
  }
  synchronized int openLoans() { return openLoans; }
}
