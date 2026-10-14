import java.util.EnumSet;

public class ParkingScope {
  public static void main(String[] args) {
    for (UseCase uc : UseCase.values()) {
      String tag = uc.inV1 ? "v1   " : "later";
      System.out.println(tag + " " + uc.actor + " -> " + uc);
    }
    for (VehicleType v : VehicleType.values()) {
      System.out.println(v + " may use " + v.fits);
    }
  }
}

enum Actor { DRIVER, ATTENDANT, SYSTEM }

enum SpotType { MOTORBIKE, COMPACT, LARGE }

enum VehicleType {
  MOTORBIKE(EnumSet.allOf(SpotType.class)),
  CAR(EnumSet.of(SpotType.COMPACT, SpotType.LARGE)),
  TRUCK(EnumSet.of(SpotType.LARGE));

  final EnumSet<SpotType> fits;
  VehicleType(EnumSet<SpotType> fits) { this.fits = fits; }
}

enum UseCase {
  TAKE_TICKET(Actor.DRIVER, true),
  PAY_FEE(Actor.DRIVER, true),
  EXIT_LOT(Actor.DRIVER, true),
  SHOW_FREE_SPOTS(Actor.SYSTEM, true),
  HANDLE_LOST_TICKET(Actor.ATTENDANT, true),
  RESERVE_IN_ADVANCE(Actor.DRIVER, false),
  MONTHLY_PASS(Actor.DRIVER, false),
  EV_CHARGING(Actor.DRIVER, false);

  final Actor actor;
  final boolean inV1;
  UseCase(Actor actor, boolean inV1) {
    this.actor = actor;
    this.inV1 = inV1;
  }
}
