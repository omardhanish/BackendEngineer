import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Objects;
import java.util.Random;

public class InjectedPasses {
    public static void main(String[] args) {
        // The test is the composition root: a fixed instant, a seeded Random.
        var clock = Clock.fixed(Instant.parse("2026-03-01T09:00:00Z"),
                ZoneOffset.UTC);
        var issuer = new PassIssuer(clock, new RandomCodes(new Random(42)));
        System.out.println(issuer.issue("sam"));
        System.out.println(issuer.issue("kim"));
        // An id generator makes codes readable in a test.
        var counted = new PassIssuer(clock, new SequenceCodes());
        System.out.println(counted.issue("lee").code());
        try {
            new PassIssuer(clock, null);
        } catch (NullPointerException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        // Production root: Clock.systemUTC() and new SecureRandom().
    }
}

record GuestPass(String guest, String code, Instant expires) { }

// Randomness as a role, so each root picks the source.
interface CodeSource { String next(); }

final class RandomCodes implements CodeSource {
    private final Random random;
    RandomCodes(Random random) {
        this.random = Objects.requireNonNull(random, "random");
    }
    public String next() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}

final class SequenceCodes implements CodeSource {
    private int last;
    public String next() { return String.format("%06d", ++last); }
}

final class PassIssuer {
    private static final Duration VALID_FOR = Duration.ofHours(24);
    private final Clock clock;
    private final CodeSource codes;

    PassIssuer(Clock clock, CodeSource codes) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.codes = Objects.requireNonNull(codes, "codes");
    }
    GuestPass issue(String guest) {
        Objects.requireNonNull(guest, "guest");
        return new GuestPass(guest, codes.next(),
                clock.instant().plus(VALID_FOR));
    }
}
