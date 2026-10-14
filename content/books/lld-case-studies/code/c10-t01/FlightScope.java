import java.util.*;

public class FlightScope {
  public static void main(String[] args) {
    Set<UseCase> v1 = EnumSet.of(UseCase.SEARCH_FLIGHTS,
        UseCase.HOLD_FARE, UseCase.ADD_PASSENGERS, UseCase.PAY_AND_TICKET,
        UseCase.CHOOSE_SEAT, UseCase.CANCEL_BOOKING,
        UseCase.EXPIRE_HOLDS);
    for (Actor actor : Actor.values()) {
      System.out.println(actor + ":");
      for (UseCase uc : UseCase.values()) {
        if (uc.actor != actor) continue;
        String tag = v1.contains(uc) ? "IN " : "OUT";
        System.out.println("  " + tag + " " + uc);
      }
    }
    long in = v1.size(), out = UseCase.values().length - in;
    System.out.println("in scope " + in + ", deferred " + out);
  }
}

enum Actor { TRAVELLER, AIRLINE_OPS, SYSTEM }

enum UseCase {
  SEARCH_FLIGHTS(Actor.TRAVELLER), HOLD_FARE(Actor.TRAVELLER),
  ADD_PASSENGERS(Actor.TRAVELLER), PAY_AND_TICKET(Actor.TRAVELLER),
  CHOOSE_SEAT(Actor.TRAVELLER), CANCEL_BOOKING(Actor.TRAVELLER),
  MULTI_CITY_TRIP(Actor.TRAVELLER), LOYALTY_MILES(Actor.TRAVELLER),
  SCHEDULE_FLIGHT(Actor.AIRLINE_OPS), OVERBOOK_FLIGHT(Actor.AIRLINE_OPS),
  EXPIRE_HOLDS(Actor.SYSTEM);

  final Actor actor;
  UseCase(Actor actor) { this.actor = actor; }
}
