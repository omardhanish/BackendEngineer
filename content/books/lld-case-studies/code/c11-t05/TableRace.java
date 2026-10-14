import java.util.*;
import java.util.concurrent.*;

public class TableRace {
  public static void main(String[] args) throws Exception {
    System.out.println("unsafe: " + race(false));
    System.out.println("safe:   " + race(true));
  }

  static List<String> race(boolean safe) throws Exception {
    List<TableSchedule> bestFitOrder = List.of(
        new TableSchedule("T2"), new TableSchedule("T4"));
    Slot seven = new Slot(19 * 60, 19 * 60 + 90);
    CyclicBarrier bothChecked = new CyclicBarrier(2);
    List<String> got = new CopyOnWriteArrayList<>();
    Runnable party = () -> got.add(safe
        ? bookSafe(bestFitOrder, seven)
        : bookUnsafe(bestFitOrder, seven, bothChecked));
    Thread a = new Thread(party), b = new Thread(party);
    a.start(); b.start(); a.join(); b.join();
    List<String> sorted = new ArrayList<>(got);
    Collections.sort(sorted);
    return sorted;
  }

  static String bookUnsafe(List<TableSchedule> tables, Slot s,
      CyclicBarrier bothChecked) {
    TableSchedule pick = null;
    for (TableSchedule t : tables)                 // check ...
      if (t.isFree(s)) { pick = t; break; }
    try { bothChecked.await(); } catch (Exception e) { throw
        new IllegalStateException(e); }            // force the gap
    pick.add(s);                                   // ... then act
    return pick.id;
  }

  static String bookSafe(List<TableSchedule> tables, Slot s) {
    for (TableSchedule t : tables)
      if (t.tryReserve(s)) return t.id;          // check + act, atomic
    return "NO_TABLE";
  }
}

record Slot(int start, int end) {
  boolean overlaps(Slot o) { return start < o.end && o.start < end; }
}

class TableSchedule {                  // one lock per table, not global
  final String id;
  private final List<Slot> booked = new ArrayList<>();
  TableSchedule(String id) { this.id = id; }

  synchronized boolean isFree(Slot s) {
    for (Slot b : booked) if (b.overlaps(s)) return false;
    return true;
  }
  synchronized void add(Slot s) { booked.add(s); }
  synchronized boolean tryReserve(Slot s) {
    if (!isFree(s)) return false;
    booked.add(s);
    return true;
  }
}
