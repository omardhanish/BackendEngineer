import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

public class PluggablePremium {
    public static void main(String[] args) {
        var registry = new RuleRegistry(List.of(
                new CarRule(), new HomeRule(), new PetRule()));
        var quotes = new QuoteService(registry);
        for (String cover : List.of("CAR", "HOME", "PET", "BOAT")) {
            try {
                System.out.println(cover + " cover, 20k insured: "
                        + quotes.premiumCents(cover, 20));
            } catch (IllegalArgumentException e) {
                System.out.println(cover + ": " + e.getMessage());
            }
        }
    }
}

// Protected Variations: the stable contract every cover rule hides behind.
interface PremiumRule {
    String cover();
    long premiumCents(int insuredK);
}

// Polymorphism: each cover owns its rule; no switch on type.
record CarRule() implements PremiumRule {
    public String cover() { return "CAR"; }
    public long premiumCents(int k) { return 30_000 + 1_500L * k; }
}
record HomeRule() implements PremiumRule {
    public String cover() { return "HOME"; }
    public long premiumCents(int k) { return 12_000 + 400L * k; }
}
record PetRule() implements PremiumRule {
    public String cover() { return "PET"; }
    public long premiumCents(int k) { return 8_000 + 300L * k; }
}

// Pure Fabrication: not a domain thing; it exists to look rules up.
final class RuleRegistry {
    private final Map<String, PremiumRule> byCover = new TreeMap<>();
    RuleRegistry(List<PremiumRule> all) { all.forEach(this::register); }
    void register(PremiumRule r) { byCover.put(r.cover(), r); }
    PremiumRule get(String cover) {
        PremiumRule r = byCover.get(Objects.requireNonNull(cover, "cover"));
        if (r == null) throw new IllegalArgumentException("unknown cover");
        return r;
    }
}

// Indirection: the quote form talks to this, never to a rule class.
record QuoteService(RuleRegistry registry) {
    long premiumCents(String cover, int insuredK) {
        if (insuredK <= 0) throw new IllegalArgumentException("insuredK <= 0");
        return registry.get(cover).premiumCents(insuredK);
    }
}
