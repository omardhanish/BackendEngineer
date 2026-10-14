import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;

public class HotelScope {
  public static void main(String[] args) {
    EnumSet<UseCase> v1 = EnumSet.range(UseCase.SEARCH, UseCase.NO_SHOW);
    for (UseCase uc : UseCase.values()) {
      String tag = v1.contains(uc) ? "IN " : "OUT";
      System.out.println(tag + " " + uc.actor + " -> " + uc);
    }
    // Scope rule: a stay is [checkIn, checkOut), counted in nights.
    Stay a = new Stay(LocalDate.of(2026, 3, 10), LocalDate.of(2026, 3, 12));
    Stay b = new Stay(LocalDate.of(2026, 3, 12), LocalDate.of(2026, 3, 14));
    System.out.println("nights in a: " + a.nights());
    System.out.println("a overlaps b? " + a.overlaps(b));
  }
}

enum Actor { GUEST, FRONT_DESK, SYSTEM, HOTEL_ADMIN }

enum UseCase {
  SEARCH(Actor.GUEST),
  RESERVE_AND_PAY(Actor.GUEST),
  CANCEL(Actor.GUEST),
  CHECK_IN(Actor.FRONT_DESK),
  CHECK_OUT(Actor.FRONT_DESK),
  EXPIRE_HOLDS(Actor.SYSTEM),
  NO_SHOW(Actor.SYSTEM),
  DYNAMIC_PRICING(Actor.HOTEL_ADMIN),
  LOYALTY_POINTS(Actor.GUEST);

  final Actor actor;
  UseCase(Actor actor) { this.actor = actor; }
}

record Stay(LocalDate checkIn, LocalDate checkOut) {
  Stay {
    if (!checkOut.isAfter(checkIn))
      throw new IllegalArgumentException("check-out must follow check-in");
  }
  long nights() { return ChronoUnit.DAYS.between(checkIn, checkOut); }
  boolean overlaps(Stay o) {
    return checkIn.isBefore(o.checkOut) && o.checkIn.isBefore(checkOut);
  }
}
