import java.time.LocalTime;
import java.util.EnumSet;

public class Scope {
  public static void main(String[] args) {
    EnumSet<UseCase> v1 = EnumSet.range(UseCase.FIND_FREE_ROOM,
        UseCase.RELEASE_NO_SHOW);
    for (UseCase uc : UseCase.values()) {
      String tag = v1.contains(uc) ? "IN " : "OUT";
      System.out.println(tag + " " + uc.actor + " -> " + uc);
    }
    // The core rule: [start, end) intervals of one room never overlap.
    System.out.println("10:00-11:00 vs 11:00-12:00 clash? "
        + clash("10:00", "11:00", "11:00", "12:00"));
    System.out.println("10:00-11:00 vs 10:30-11:30 clash? "
        + clash("10:00", "11:00", "10:30", "11:30"));
  }

  static boolean clash(String s1, String e1, String s2, String e2) {
    return LocalTime.parse(s1).isBefore(LocalTime.parse(e2))
        && LocalTime.parse(s2).isBefore(LocalTime.parse(e1));
  }
}

enum Actor { EMPLOYEE, FACILITIES_ADMIN, SYSTEM }

enum UseCase {
  FIND_FREE_ROOM(Actor.EMPLOYEE),
  BOOK_ROOM(Actor.EMPLOYEE),
  VIEW_ROOM_CALENDAR(Actor.EMPLOYEE),
  CANCEL_BOOKING(Actor.EMPLOYEE),
  CHECK_IN(Actor.EMPLOYEE),
  RELEASE_NO_SHOW(Actor.SYSTEM),
  MANAGE_ROOMS(Actor.FACILITIES_ADMIN),
  RECURRING_SERIES(Actor.EMPLOYEE),
  EXTERNAL_CALENDAR_SYNC(Actor.SYSTEM);

  final Actor actor;
  UseCase(Actor actor) { this.actor = actor; }
}
