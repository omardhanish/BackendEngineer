import java.util.EnumSet;
import java.util.Set;

public class Scope {
    public static void main(String[] args) {
        Set<UseCase> v1 = EnumSet.of(UseCase.CALL_FROM_FLOOR,
            UseCase.CHOOSE_DESTINATION, UseCase.DISPATCH_CAR,
            UseCase.STOP_AND_OPEN_DOORS, UseCase.TAKE_OUT_OF_SERVICE,
            UseCase.VIEW_CAR_STATUS);
        for (UseCase u : UseCase.values()) {
            String tag = v1.contains(u) ? "IN " : "OUT";
            System.out.println(tag + " " + u.actor + ": " + u);
        }
        System.out.println("assume: 1 building, floors 0-15, 3 cars");
    }
}

enum Actor { PASSENGER, OPERATOR, SYSTEM }

enum UseCase {
    CALL_FROM_FLOOR(Actor.PASSENGER),
    CHOOSE_DESTINATION(Actor.PASSENGER),
    DISPATCH_CAR(Actor.SYSTEM),
    STOP_AND_OPEN_DOORS(Actor.SYSTEM),
    TAKE_OUT_OF_SERVICE(Actor.OPERATOR),
    VIEW_CAR_STATUS(Actor.OPERATOR),
    DESTINATION_KEYPAD(Actor.PASSENGER),
    FIRE_SERVICE_MODE(Actor.OPERATOR);

    final Actor actor;

    UseCase(Actor actor) { this.actor = actor; }
}
