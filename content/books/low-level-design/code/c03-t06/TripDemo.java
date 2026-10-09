public class TripDemo {
    public static void main(String[] args) {
        FareRule standard = (km, min) -> 50 + 12L * km + 2L * min;
        Trip trip = new Trip(standard);
        trip.moveTo(TripStatus.ACCEPTED);
        trip.moveTo(TripStatus.STARTED);
        try {
            trip.moveTo(TripStatus.CANCELLED);
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        trip.moveTo(TripStatus.COMPLETED);
        System.out.println("normal fare: " + trip.fare(8, 20));
        Trip peak = new Trip(new SurgeFare(standard, 15));
        System.out.println("surge fare: " + peak.fare(8, 20));
    }
}

enum TripStatus {
    REQUESTED, ACCEPTED, STARTED, COMPLETED, CANCELLED;
    boolean canMoveTo(TripStatus next) {
        return switch (this) {
            case REQUESTED -> next == ACCEPTED || next == CANCELLED;
            case ACCEPTED -> next == STARTED || next == CANCELLED;
            case STARTED -> next == COMPLETED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}

interface FareRule { long fare(int km, int min); }

// tenths = 15 means 1.5x
record SurgeFare(FareRule base, int tenths) implements FareRule {
    public long fare(int km, int min) {
        return base.fare(km, min) * tenths / 10;
    }
}

final class Trip {
    private final FareRule rule;
    private TripStatus status = TripStatus.REQUESTED;
    Trip(FareRule rule) { this.rule = rule; }
    long fare(int km, int min) { return rule.fare(km, min); }
    synchronized void moveTo(TripStatus next) {
        if (!status.canMoveTo(next))
            throw new IllegalStateException(status + " -> " + next);
        status = next;
    }
}
