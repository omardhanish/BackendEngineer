import java.util.*;

public class TripStateMachineDemo {
    public static void main(String[] args) {
        Trip t1 = new Trip("T-1");
        t1.assign("D3");
        t1.arrive();
        t1.start();
        t1.complete(1850);
        System.out.println(t1.summary());

        Trip t2 = new Trip("T-2");
        t2.assign("D4");
        t2.arrive();
        t2.start();
        attempt(t2::cancel);                 // rider cancels mid-ride
        attempt(() -> t2.assign("D9"));      // stale reassign message
        System.out.println(t2.summary());
    }

    static void attempt(Runnable action) {
        try { action.run(); }
        catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}

enum TripStatus {
    REQUESTED, ASSIGNED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED;

    boolean canMoveTo(TripStatus next) {
        return switch (this) {
            case REQUESTED -> next == ASSIGNED || next == CANCELLED;
            case ASSIGNED -> next == ARRIVED || next == CANCELLED;
            case ARRIVED -> next == IN_PROGRESS || next == CANCELLED;
            case IN_PROGRESS -> next == COMPLETED;
            case COMPLETED, CANCELLED -> false;  // terminal states
        };
    }
}

final class Trip {
    private final String id;
    private final List<TripStatus> history = new ArrayList<>();
    private TripStatus status = TripStatus.REQUESTED;
    private String driverId = "-";
    private long fareCents;

    Trip(String id) {
        this.id = Objects.requireNonNull(id, "id");
        history.add(status);
    }
    synchronized void assign(String driverId) {
        Objects.requireNonNull(driverId, "driverId");
        moveTo(TripStatus.ASSIGNED);
        this.driverId = driverId;
    }
    synchronized void arrive() { moveTo(TripStatus.ARRIVED); }
    synchronized void start() { moveTo(TripStatus.IN_PROGRESS); }
    synchronized void cancel() { moveTo(TripStatus.CANCELLED); }
    synchronized void complete(long fareCents) {
        if (fareCents <= 0) throw new IllegalArgumentException("fare <= 0");
        moveTo(TripStatus.COMPLETED);
        this.fareCents = fareCents;
    }
    synchronized String summary() {
        return id + " " + driverId + " " + history + " fare=" + fareCents;
    }
    private void moveTo(TripStatus next) {
        if (!status.canMoveTo(next)) {
            throw new IllegalStateException(id + ": " + status + " -> " + next
                + " not allowed");
        }
        status = next;
        history.add(next);
    }
}
