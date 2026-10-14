import java.time.LocalDate;
import java.util.*;

public class PickupExpiry {
  public static void main(String[] args) {
    HoldShelf shelf = new HoldShelf("CP-1", 3);
    shelf.join("M-2");
    shelf.join("M-3");
    shelf.copyReturned(day(10));     // first in line gets 3 days
    shelf.sweep(day(13));            // last pickup day: keep waiting
    shelf.sweep(day(14));            // M-2 missed it; M-3 is next
    shelf.pickUp("M-2", day(14));    // too late for M-2
    shelf.copyReturned(day(14));     // the same copy scanned twice
    shelf.cancel("M-3", day(15));    // nobody left: back to shelf
  }
  static LocalDate day(int d) { return LocalDate.of(2026, 1, d); }
}

class HoldShelf {
  private final String copyId;
  private final int pickupDays;
  private final Deque<String> waiting = new ArrayDeque<>();
  private String status = "ON_LOAN", heldFor;
  private LocalDate until;

  HoldShelf(String copyId, int pickupDays) {
    this.copyId = copyId; this.pickupDays = pickupDays;
  }
  synchronized void join(String member) { waiting.add(member); }

  synchronized void copyReturned(LocalDate today) {
    if (!status.equals("ON_LOAN")) {          // idempotent return
      say("duplicate return ignored, copy is " + status);
      return;
    }
    offerToNext(today);
  }
  synchronized void sweep(LocalDate today) {  // scheduled job
    if (status.equals("ON_HOLD_SHELF") && today.isAfter(until)) {
      say(heldFor + " missed pickup");
      offerToNext(today);
    } else say("sweep " + today + ": nothing expired");
  }
  synchronized void pickUp(String member, LocalDate today) {
    if (!member.equals(heldFor) || today.isAfter(until)) {
      say("pickup refused for " + member);
      return;
    }
    status = "ON_LOAN"; heldFor = null;
    say(member + " picked up " + copyId);
  }
  synchronized void cancel(String member, LocalDate today) {
    if (!member.equals(heldFor)) { waiting.remove(member); return; }
    say(member + " cancelled");
    offerToNext(today);
  }
  private void offerToNext(LocalDate today) {
    heldFor = waiting.poll();
    if (heldFor == null) {
      status = "AVAILABLE"; until = null;
    } else {
      status = "ON_HOLD_SHELF"; until = today.plusDays(pickupDays);
    }
    say(copyId + " " + status + (heldFor == null ? ""
        : " for " + heldFor + " until " + until));
  }
  private void say(String s) { System.out.println(s); }
}
