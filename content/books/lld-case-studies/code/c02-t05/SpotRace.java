import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.atomic.AtomicReference;

public class SpotRace {
  public static void main(String[] args) throws Exception {
    System.out.println("check-then-set, 1 spot: " + race(false, 1));
    System.out.println("compareAndSet, 1 spot:  " + race(true, 1));
    System.out.println("compareAndSet, 2 spots: " + race(true, 2));
  }

  static List<String> race(boolean safe, int spotCount) throws Exception {
    List<ParkingSpot> spots = new ArrayList<>();
    for (int i = 1; i <= spotCount; i++)
      spots.add(new ParkingSpot("F2-C" + i));
    CyclicBarrier bothLooked = new CyclicBarrier(2);
    List<String> taken = Collections.synchronizedList(new ArrayList<>());
    List<Thread> gates = new ArrayList<>();
    for (String ticket : List.of("T-1", "T-2")) {
      Thread gate = new Thread(() -> {
        for (ParkingSpot s : spots) {         // try spots in order
          boolean won = safe ? s.claim(ticket)
              : s.unsafeClaim(ticket, bothLooked);
          if (won) { taken.add(s.id); return; }
        }
      });
      gates.add(gate);
      gate.start();
    }
    for (Thread g : gates) g.join();          // join before reading
    Collections.sort(taken);
    return taken;
  }
}

class ParkingSpot {
  final String id;
  private final AtomicReference<String> ticketId = new AtomicReference<>();

  ParkingSpot(String id) { this.id = id; }

  boolean claim(String ticket) {              // check and set in one step
    return ticketId.compareAndSet(null, ticket);
  }

  boolean unsafeClaim(String ticket, CyclicBarrier bothLooked) {
    boolean free = ticketId.get() == null;    // step 1: look
    try { bothLooked.await(); }               // the other gate looks too
    catch (Exception e) { throw new IllegalStateException(e); }
    if (free) ticketId.set(ticket);           // step 2: act on stale look
    return free;
  }
}
