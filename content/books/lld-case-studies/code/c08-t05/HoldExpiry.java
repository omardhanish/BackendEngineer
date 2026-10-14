import java.time.*;
import java.util.concurrent.ConcurrentHashMap;

public class HoldExpiry {
  public static void main(String[] args) {
    SeatHolds seats = new SeatHolds(Duration.ofMinutes(10));
    Instant t0 = Instant.parse("2026-01-15T18:00:00Z");
    show("U-7 hold   ", seats.tryHold("A1", "H-1", t0));
    show("U-9 hold   ", seats.tryHold("A1", "H-2", t0.plusSeconds(300)));
    show("U-9 hold   ", seats.tryHold("A1", "H-2", t0.plusSeconds(660)));
    show("U-7 confirm", seats.confirm("A1", "H-1", t0.plusSeconds(700)));
    show("U-9 confirm", seats.confirm("A1", "H-2", t0.plusSeconds(720)));
    show("U-9 retry  ", seats.confirm("A1", "H-2", t0.plusSeconds(725)));
  }
  static void show(String who, Object result) {
    System.out.println(who + " -> " + result);
  }
}

record Hold(String holdId, Instant expiresAt, boolean booked) {
  boolean expiredAt(Instant now) {
    return !booked && !now.isBefore(expiresAt);
  }
}

class SeatHolds {
  private final ConcurrentHashMap<String, Hold> bySeat =
      new ConcurrentHashMap<>();
  private final Duration ttl;
  SeatHolds(Duration ttl) { this.ttl = ttl; }

  boolean tryHold(String seat, String holdId, Instant now) {
    Hold mine = new Hold(holdId, now.plus(ttl), false);
    // compute runs atomically per key: check and write are one step
    Hold after = bySeat.compute(seat, (k, cur) ->
        cur == null || cur.expiredAt(now) ? mine : cur);
    return after == mine;
  }

  String confirm(String seat, String holdId, Instant now) {
    String[] outcome = new String[1];
    bySeat.compute(seat, (k, cur) -> {
      if (cur == null || !cur.holdId().equals(holdId)) {
        outcome[0] = "HOLD_LOST";
        return cur;
      }
      if (cur.booked()) {
        outcome[0] = "ALREADY_CONFIRMED";
        return cur;
      }
      if (cur.expiredAt(now)) {
        outcome[0] = "HOLD_EXPIRED";
        return cur;
      }
      outcome[0] = "CONFIRMED";
      return new Hold(holdId, cur.expiresAt(), true);
    });
    return outcome[0];
  }
}
