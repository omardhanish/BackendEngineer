import java.util.*;

public class PricingDemo {
    public static void main(String[] args) {
        Map<VehicleType, FareStrategy> rates = new EnumMap<>(VehicleType.class);
        rates.put(VehicleType.BIKE, new MeteredFare(50, 40, 0, 200));
        rates.put(VehicleType.SEDAN, new MeteredFare(150, 90, 20, 500));
        rates.put(VehicleType.XL, new MeteredFare(250, 130, 30, 800));
        SurgePolicy none = (requests, drivers) -> 1.0;
        var calm = new PriceCalculator(rates, none);
        var busy = new PriceCalculator(rates, new DemandSurge(2.0));
        TripInfo ride = new TripInfo(VehicleType.XL, 8.0, 20);
        TripInfo hop = new TripInfo(VehicleType.BIKE, 1.0, 4);
        System.out.println("XL calm:  " + calm.quote(ride, 30, 20));
        System.out.println("XL busy:  " + busy.quote(ride, 30, 20));
        System.out.println("XL storm: " + busy.quote(ride, 90, 10));
        System.out.println("BIKE hop: " + busy.quote(hop, 30, 20));
    }
}

enum VehicleType { BIKE, SEDAN, XL }
record TripInfo(VehicleType type, double km, int minutes) {}

interface FareStrategy { long baseCents(TripInfo trip); }
interface SurgePolicy { double multiplier(int openRequests, int freeDrivers); }

record MeteredFare(long flagCents, long perKmCents, long perMinCents,
                   long minimumCents) implements FareStrategy {
    public long baseCents(TripInfo t) {
        long metered = flagCents + Math.round(t.km() * perKmCents)
            + t.minutes() * perMinCents;
        return Math.max(metered, minimumCents);
    }
}

final class DemandSurge implements SurgePolicy {
    private final double cap;
    DemandSurge(double cap) {
        if (cap < 1.0) throw new IllegalArgumentException("cap must be >= 1");
        this.cap = cap;
    }
    public double multiplier(int requests, int drivers) {
        if (drivers <= 0) return cap;
        double stepped = Math.floor((double) requests / drivers * 4) / 4;
        return Math.min(cap, Math.max(1.0, stepped)); // 0.25 steps, capped
    }
}

final class PriceCalculator {
    private final Map<VehicleType, FareStrategy> rates;
    private final SurgePolicy surge;
    PriceCalculator(Map<VehicleType, FareStrategy> rates, SurgePolicy surge) {
        this.rates = Map.copyOf(rates);
        this.surge = Objects.requireNonNull(surge, "surge");
    }
    String quote(TripInfo trip, int requests, int drivers) {
        FareStrategy fare = rates.get(trip.type());
        if (fare == null) {
            throw new IllegalArgumentException("no rate for " + trip.type());
        }
        double m = surge.multiplier(requests, drivers);
        long cents = Math.round(fare.baseCents(trip) * m);
        return String.format(Locale.ROOT, "%d cents (x%.2f)", cents, m);
    }
}
