import java.time.*;
import java.util.*;

public class HoldAndPayEdges {
  public static void main(String[] args) {
    Desk d = new Desk(1);                       // one Deluxe room
    d.hold("RS-1", "09:00");
    d.hold("RS-2", "09:10");                    // room still held
    d.sweep("09:16");                           // RS-1 ran out of time
    d.hold("RS-2", "09:16");
    d.confirm("RS-1", "pay-1", "09:17");        // late payment
    d.confirm("RS-2", "pay-2", "09:18");        // gateway times out
    d.confirm("RS-2", "pay-2", "09:19");        // retry, same key
    d.cancel("RS-2");
    System.out.println("charges made: " + d.gateway.charges
        + ", free rooms: " + d.free);
  }
}

class Gateway {                    // remembers results per idempotency key
  final Map<String, Boolean> byKey = new HashMap<>();
  int charges = 0, timeoutsLeft = 1;
  boolean charge(String key) {
    if (byKey.containsKey(key)) return byKey.get(key);
    charges++; byKey.put(key, true);            // the money did move
    if (timeoutsLeft-- > 0) throw new IllegalStateException("timeout");
    return true;
  }
}

class Desk {
  final Gateway gateway = new Gateway();
  final Map<String, Instant> holdUntil = new TreeMap<>();
  final Set<String> confirmed = new TreeSet<>();
  int free;
  Desk(int rooms) { free = rooms; }
  static Instant at(String hhmm) {
    return Instant.parse("2026-03-01T" + hhmm + ":00Z");
  }
  void hold(String id, String now) {
    if (free == 0) { say(id + " hold refused: sold out"); return; }
    free--;
    holdUntil.put(id, at(now).plus(Duration.ofMinutes(15)));
    say(id + " HELD until " + holdUntil.get(id));
  }
  void sweep(String now) {          // the system actor's scheduled job
    holdUntil.entrySet().removeIf(e -> {
      boolean due = !confirmed.contains(e.getKey())
          && !at(now).isBefore(e.getValue());
      if (due) { free++; say(e.getKey() + " EXPIRED, room freed"); }
      return due;
    });
  }
  void confirm(String id, String key, String now) {
    if (confirmed.contains(id)) { say(id + " already CONFIRMED"); return; }
    Instant until = holdUntil.get(id);
    if (until == null || !at(now).isBefore(until)) {
      say(id + " refused: hold expired, refund if charged"); return;
    }
    try {
      if (gateway.charge(key)) { confirmed.add(id); say(id + " CONFIRMED"); }
    } catch (IllegalStateException e) {    // unknown outcome: keep the hold
      say(id + " payment " + e.getMessage() + ", still HELD");
    }
  }
  void cancel(String id) {
    if (confirmed.remove(id)) {
      holdUntil.remove(id); free++;
      say(id + " CANCELLED, room freed");
    }
  }
  static void say(String s) { System.out.println(s); }
}
