import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

public class HiddenDependencies {
    public static void main(String[] args) {
        // 1. Hidden time and randomness: a test can check only the shape.
        GuestPass pass = new HiddenIssuer().issue("sam");
        boolean shapeOk = pass.code().matches("\\d{6}");
        System.out.println("code looks valid: " + shapeOk);
        // 2. Setter injection: nothing forces the setter to be called.
        try {
            new SetterIssuer().issue("kim");
        } catch (NullPointerException e) {
            System.out.println("setter forgotten: " + e.getMessage());
        }
        // 3. Service locator: an earlier test's clock is still registered.
        Locator.put(Clock.class, Clock.fixed(
                Instant.parse("2020-01-01T00:00:00Z"), ZoneOffset.UTC));
        // ...a later test forgets to register its own clock.
        System.out.println("later test expiry: "
                + new LocatorIssuer().issue("lee").expires());
    }
}

record GuestPass(String guest, String code, Instant expires) { }

final class HiddenIssuer {
    private final Random random = new Random();     // unseeded, unswappable
    GuestPass issue(String guest) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        return new GuestPass(guest, code,
                Instant.now().plus(Duration.ofHours(24)));
    }
}

final class SetterIssuer {
    private Clock clock;                            // not final, may stay null
    void setClock(Clock clock) { this.clock = clock; }
    GuestPass issue(String guest) {
        return new GuestPass(guest, "000000",
                clock.instant().plus(Duration.ofHours(24)));
    }
}

// A global map: dependencies are fetched, not declared.
final class Locator {
    private static final Map<Class<?>, Object> SERVICES = new HashMap<>();
    static <T> void put(Class<T> type, T s) { SERVICES.put(type, s); }
    static <T> T get(Class<T> type) { return type.cast(SERVICES.get(type)); }
}

final class LocatorIssuer {
    GuestPass issue(String guest) {
        Clock clock = Locator.get(Clock.class);    // invisible to callers
        return new GuestPass(guest, "000000",
                clock.instant().plus(Duration.ofHours(24)));
    }
}
