import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public class ElevatorLifecycle {
    public static void main(String[] args) {
        Elevator e1 = new Elevator("E1");
        e1.moveTo(ElevatorState.MOVING);          // hall call at floor 4
        e1.moveTo(ElevatorState.DOORS_OPEN);      // arrived at floor 4
        e1.moveTo(ElevatorState.MOVING);          // doors still open
        e1.moveTo(ElevatorState.IDLE);            // doors closed
        e1.moveTo(ElevatorState.MOVING);
        e1.moveTo(ElevatorState.OUT_OF_SERVICE);  // emergency stop
        e1.moveTo(ElevatorState.MOVING);          // must be inspected
        e1.moveTo(ElevatorState.IDLE);            // operator restores
    }
}

enum ElevatorState {
    IDLE, MOVING, DOORS_OPEN, OUT_OF_SERVICE;

    private static final Map<ElevatorState, Set<ElevatorState>> NEXT =
        new EnumMap<>(ElevatorState.class);
    static {
        NEXT.put(IDLE, EnumSet.of(MOVING, DOORS_OPEN, OUT_OF_SERVICE));
        NEXT.put(MOVING, EnumSet.of(DOORS_OPEN, OUT_OF_SERVICE));
        NEXT.put(DOORS_OPEN, EnumSet.of(IDLE, OUT_OF_SERVICE));
        NEXT.put(OUT_OF_SERVICE, EnumSet.of(IDLE));
    }

    boolean canMoveTo(ElevatorState next) {
        return NEXT.get(this).contains(next);
    }
}

class Elevator {
    final String id;
    private ElevatorState state = ElevatorState.IDLE;

    Elevator(String id) { this.id = id; }

    void moveTo(ElevatorState next) {
        if (!state.canMoveTo(next)) {
            System.out.println(id + " refused " + state + " -> " + next);
            return;
        }
        System.out.println(id + " " + state + " -> " + next);
        state = next;
    }
}
