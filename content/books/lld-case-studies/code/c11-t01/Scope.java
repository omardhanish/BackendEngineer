import java.util.*;

public class Scope {
  public static void main(String[] args) {
    Set<UseCase> v1 = EnumSet.of(UseCase.SEARCH_SLOTS, UseCase.BOOK_TABLE,
        UseCase.CANCEL, UseCase.SEAT_PARTY, UseCase.FINISH_MEAL,
        UseCase.MARK_NO_SHOW);
    for (UseCase u : UseCase.values()) {
      String tag = v1.contains(u) ? "IN " : "OUT";
      System.out.println(tag + " " + u.actor + ": " + u);
    }
    Rules r = new Rules(90, 15, 8, 15);
    System.out.println(r);
    System.out.println("party of 10 allowed? " + r.allows(10));
  }
}

enum Actor { CUSTOMER, HOST, SYSTEM }

enum UseCase {
  SEARCH_SLOTS(Actor.CUSTOMER), BOOK_TABLE(Actor.CUSTOMER),
  CANCEL(Actor.CUSTOMER), SEAT_PARTY(Actor.HOST),
  FINISH_MEAL(Actor.HOST), MARK_NO_SHOW(Actor.SYSTEM),
  WAITLIST(Actor.CUSTOMER), PAY_DEPOSIT(Actor.CUSTOMER),
  JOIN_TABLES(Actor.HOST);

  final Actor actor;
  UseCase(Actor actor) { this.actor = actor; }
}

// Stated assumptions, not measured facts. Change them in one place.
record Rules(int diningMinutes, int slotStepMinutes, int maxParty,
    int graceMinutes) {
  boolean allows(int partySize) {
    return partySize >= 1 && partySize <= maxParty;
  }
}
