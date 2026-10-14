import java.util.*;

public class RiderAssignmentDemo {
    public static void main(String[] args) {
        RiderPool pool = new RiderPool(List.of(
            new Rider("R1", new Location(0.6, 0.0), false), // declines offers
            new Rider("R2", new Location(1.0, 1.0), true),
            new Rider("R3", new Location(6.0, 2.0), true),
            new Rider("R4", new Location(0.0, 2.0), true)));
        RiderAssigner assigner = new RiderAssigner(pool, 3.0, 2);
        Location kitchen = new Location(0, 0);
        for (String orderId : List.of("O-7", "O-8", "O-9")) {
            String result = assigner.assign(orderId, kitchen)
                .map(Rider::id).orElse("queued, retry later");
            System.out.println(orderId + " -> " + result);
        }
    }
}

record Location(double x, double y) {
    double km(Location o) { return Math.hypot(x - o.x, y - o.y); }
}
record Rider(String id, Location at, boolean acceptsOffers) {}

final class RiderPool {
    private final Map<String, Rider> free = new LinkedHashMap<>();
    RiderPool(List<Rider> riders) { riders.forEach(r -> free.put(r.id(), r)); }
    synchronized List<Rider> freeRiders() { return List.copyOf(free.values()); }
    synchronized boolean take(String id) { return free.remove(id) != null; }
}

final class RiderAssigner {
    private final RiderPool pool;
    private final double maxKm;
    private final int maxOffers;
    RiderAssigner(RiderPool pool, double maxKm, int maxOffers) {
        if (maxKm <= 0 || maxOffers < 1) {
            throw new IllegalArgumentException("maxKm > 0 and maxOffers >= 1");
        }
        this.pool = Objects.requireNonNull(pool, "pool");
        this.maxKm = maxKm;
        this.maxOffers = maxOffers;
    }
    Optional<Rider> assign(String orderId, Location pickup) {
        List<Rider> ranked = pool.freeRiders().stream()
            .filter(r -> r.at().km(pickup) <= maxKm)
            .sorted(Comparator.comparingDouble((Rider r) -> r.at().km(pickup))
                .thenComparing(Rider::id))
            .limit(maxOffers)
            .toList();
        for (Rider r : ranked) {
            if (!r.acceptsOffers()) {               // the rider says no
                System.out.println("  " + r.id() + " declined " + orderId);
            } else if (pool.take(r.id())) {         // atomic reserve
                return Optional.of(r);
            }
        }
        return Optional.empty();
    }
}
