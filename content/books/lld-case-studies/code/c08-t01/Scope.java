import java.util.EnumSet;

public class Scope {
  public static void main(String[] args) {
    EnumSet<UseCase> v1 = EnumSet.of(UseCase.BROWSE_SHOWS,
        UseCase.VIEW_SEAT_MAP, UseCase.HOLD_SEATS,
        UseCase.PAY_AND_CONFIRM, UseCase.CANCEL_BOOKING,
        UseCase.EXPIRE_HOLDS);
    for (UseCase uc : UseCase.values()) {
      String tag = v1.contains(uc) ? "IN " : "OUT";
      System.out.println(tag + " " + uc.actor + " -> " + uc);
    }
  }
}

enum Actor { CUSTOMER, THEATRE_ADMIN, SYSTEM }

enum UseCase {
  BROWSE_SHOWS(Actor.CUSTOMER),
  VIEW_SEAT_MAP(Actor.CUSTOMER),
  HOLD_SEATS(Actor.CUSTOMER),
  PAY_AND_CONFIRM(Actor.CUSTOMER),
  CANCEL_BOOKING(Actor.CUSTOMER),
  EXPIRE_HOLDS(Actor.SYSTEM),
  SCHEDULE_SHOW(Actor.THEATRE_ADMIN),
  FOOD_ADD_ONS(Actor.CUSTOMER);

  final Actor actor;
  UseCase(Actor actor) { this.actor = actor; }
}
