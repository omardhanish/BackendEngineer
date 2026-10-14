import java.util.*;

public class AtmLifecycle {
  public static void main(String[] args) {
    ATM atm = new ATM("ATM-7");
    atm.moveTo(ATMState.DISPENSING);          // no card yet: refused
    atm.moveTo(ATMState.CARD_INSERTED);
    atm.wrongPin(); atm.moveTo(ATMState.AUTHENTICATED);
    atm.moveTo(ATMState.DISPENSING);
    atm.moveTo(ATMState.IDLE);                // cash taken, card back
    atm.moveTo(ATMState.CARD_INSERTED);       // next customer
    atm.wrongPin(); atm.wrongPin(); atm.wrongPin();
    atm.moveTo(ATMState.OUT_OF_SERVICE);      // cassette empty
    atm.moveTo(ATMState.CARD_INSERTED);
  }
}

enum ATMState {
  IDLE, CARD_INSERTED, AUTHENTICATED, DISPENSING, OUT_OF_SERVICE;

  private static final Map<ATMState, Set<ATMState>> NEXT =
      new EnumMap<>(ATMState.class);
  static {
    NEXT.put(IDLE, EnumSet.of(CARD_INSERTED, OUT_OF_SERVICE));
    NEXT.put(CARD_INSERTED, EnumSet.of(AUTHENTICATED, IDLE));
    NEXT.put(AUTHENTICATED, EnumSet.of(DISPENSING, IDLE));
    NEXT.put(DISPENSING, EnumSet.of(IDLE, OUT_OF_SERVICE));
    NEXT.put(OUT_OF_SERVICE, EnumSet.of(IDLE));
  }
  boolean canMoveTo(ATMState to) { return NEXT.get(this).contains(to); }
}

class ATM {
  static final int MAX_PIN_TRIES = 3;
  private final String id;
  private ATMState state = ATMState.IDLE;
  private int pinTries;
  ATM(String id) { this.id = id; }

  void moveTo(ATMState to) {
    if (!state.canMoveTo(to)) {
      System.out.println(id + " refused " + state + " -> " + to);
      return;
    }
    System.out.println(id + " " + state + " -> " + to);
    state = to;
    if (to == ATMState.CARD_INSERTED) pinTries = 0;
  }
  void wrongPin() {
    if (state != ATMState.CARD_INSERTED) return;
    pinTries++;
    System.out.println(id + " wrong PIN " + pinTries + "/" + MAX_PIN_TRIES);
    if (pinTries == MAX_PIN_TRIES) {
      System.out.println(id + " card retained");
      moveTo(ATMState.IDLE);
    }
  }
}
