import java.util.*;

public class EdgeCases {
  public static void main(String[] args) {
    TableSchedule t2 = new TableSchedule();
    System.out.println(t2.book("k-1", Slot.at(19, 0)));
    System.out.println(t2.book("k-1", Slot.at(19, 0)));  // client retry
    System.out.println(t2.book("k-2", Slot.at(20, 0)));
    System.out.println(t2.book("k-3", Slot.at(21, 0)));
    System.out.println(t2.reschedule("RV-1", Slot.at(19, 30)));
    System.out.println(t2.reschedule("RV-1", Slot.at(20, 30)));
    t2.cancel("RV-2");
    System.out.println(t2.reschedule("RV-1", Slot.at(20, 30)));
  }
}

record Slot(int start, int end) {
  static Slot at(int h, int m) { return new Slot(h * 60 + m, h * 60 + m + 90); }
  boolean overlaps(Slot o) { return start < o.end && o.start < end; }
  public String toString() {
    return String.format("%02d:%02d-%02d:%02d",
        start / 60, start % 60, end / 60, end % 60);
  }
}

class TableSchedule {
  private final Map<String, Slot> byId = new TreeMap<>();
  private final Map<String, String> idByKey = new HashMap<>();
  private int seq = 0;

  synchronized String book(String key, Slot s) {
    String prior = idByKey.get(key);               // same request again
    if (prior != null)                    // a cancelled id prints null slot
      return prior + " replayed " + byId.get(prior);
    if (clash(s, null)) return "refused " + s;
    String id = "RV-" + (++seq);
    byId.put(id, s);
    idByKey.put(key, id);
    return id + " booked " + s;
  }

  synchronized String reschedule(String id, Slot s) {
    if (clash(s, id)) return id + " kept " + byId.get(id);  // old stays
    byId.put(id, s);
    return id + " moved to " + s;
  }

  synchronized void cancel(String id) { byId.remove(id); }

  private boolean clash(Slot s, String ignoreId) {
    for (Map.Entry<String, Slot> e : byId.entrySet())
      if (!e.getKey().equals(ignoreId) && e.getValue().overlaps(s))
        return true;
    return false;
  }
}
