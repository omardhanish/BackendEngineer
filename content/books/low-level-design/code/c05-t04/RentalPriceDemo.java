import java.time.Duration;
import java.util.Objects;

public class RentalPriceDemo {
    public static void main(String[] args) {
        RentalPricer pricer = new RentalPricer();
        Duration ride = Duration.ofHours(2);
        System.out.println("2 h weekday: "
            + pricer.priceInCents(ride, DayType.WEEKDAY));
        System.out.println("2 h weekend: "
            + pricer.priceInCents(ride, DayType.WEEKEND));
        try {
            pricer.priceInCents(Duration.ZERO, DayType.WEEKDAY);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

enum DayType { WEEKDAY, WEEKEND }

class RentalPricer {
    private static final long INCLUDED_MINUTES = 60;
    private static final int BASE_PRICE_CENTS = 200;
    private static final int PRICE_PER_EXTRA_HOUR_CENTS = 150;
    private static final int WEEKEND_SURCHARGE_PERCENT = 50;

    int priceInCents(Duration rideLength, DayType day) {
        requirePositive(rideLength);
        Objects.requireNonNull(day, "day");
        int price = BASE_PRICE_CENTS + extraTimePrice(rideLength);
        return day == DayType.WEEKEND ? withWeekendSurcharge(price) : price;
    }

    private static void requirePositive(Duration rideLength) {
        Objects.requireNonNull(rideLength, "rideLength");
        if (rideLength.isZero() || rideLength.isNegative()) {
            throw new IllegalArgumentException(
                "ride length must be positive, got " + rideLength);
        }
    }

    private int extraTimePrice(Duration rideLength) {
        long extraMinutes =
            Math.max(0, rideLength.toMinutes() - INCLUDED_MINUTES);
        long startedHours = (extraMinutes + 59) / 60;
        return Math.toIntExact(startedHours * PRICE_PER_EXTRA_HOUR_CENTS);
    }

    private int withWeekendSurcharge(int price) {
        return price + price * WEEKEND_SURCHARGE_PERCENT / 100;
    }
}
