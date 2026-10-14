import java.util.Objects;

public class EtaDemo {
    public static void main(String[] args) {
        EtaCalculator dry = new EtaCalculator(new ConstantSpeed(20));
        Leg leg = new Leg(10, 2.0, 4.0);
        System.out.println("cooking: " + dry.minutes(Status.ACCEPTED, leg));
        System.out.println("ready:   " + dry.minutes(Status.READY, leg));
        System.out.println("on way:  " + dry.minutes(Status.PICKED_UP, leg));
        EtaCalculator wet = new EtaCalculator(
                new Slowdown(new ConstantSpeed(20), 1.5));
        System.out.println("rain:    " + wet.minutes(Status.ACCEPTED, leg));
        EtaWatcher watcher = new EtaWatcher(3);
        for (int eta : new int[] {22, 21, 20, 26, 26, 12}) watcher.update(eta);
    }
}

enum Status { PLACED, ACCEPTED, READY, PICKED_UP, DELIVERED }

// prepLeft in minutes; toRestaurantKm from the rider; toCustomerKm: drop leg
record Leg(int prepLeft, double toRestaurantKm, double toCustomerKm) {
    Leg {
        if (prepLeft < 0 || toRestaurantKm < 0 || toCustomerKm < 0)
            throw new IllegalArgumentException("negative leg value");
    }
}

interface TravelModel { double minutes(double km); }
record ConstantSpeed(double kmPerHour) implements TravelModel {
    public double minutes(double km) { return km * 60 / kmPerHour; }
}
record Slowdown(TravelModel base, double factor) implements TravelModel {
    public double minutes(double km) { return base.minutes(km) * factor; }
}

class EtaCalculator {
    private final TravelModel travel;
    EtaCalculator(TravelModel t) { travel = Objects.requireNonNull(t); }

    int minutes(Status s, Leg leg) {
        double pickup = travel.minutes(leg.toRestaurantKm());
        double drop = travel.minutes(leg.toCustomerKm());
        double total = switch (s) {
            case PLACED, ACCEPTED -> Math.max(leg.prepLeft(), pickup) + drop;
            case READY -> pickup + drop;
            case PICKED_UP -> drop;
            case DELIVERED -> 0;
        };
        return (int) Math.ceil(total);         // never promise early
    }
}

class EtaWatcher {
    private final int threshold;
    private Integer lastSent;                   // null until first send
    EtaWatcher(int threshold) { this.threshold = threshold; }

    void update(int eta) {
        if (lastSent != null && Math.abs(eta - lastSent) < threshold) {
            System.out.println("skip     " + eta + " min");
            return;
        }
        lastSent = eta;
        System.out.println("notify   " + eta + " min");
    }
}
