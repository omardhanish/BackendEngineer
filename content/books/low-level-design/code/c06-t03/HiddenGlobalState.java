import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class HiddenGlobalState {
    public static void main(String[] args) {
        // Two "tests" of PriceService, run one after the other.
        FeatureFlags.getInstance().enable("new-pricing");
        System.out.println("test 1: " + new PriceService().quote(1000));
        // Test 2 never touched a flag, yet it inherits test 1's change.
        System.out.println("test 2: " + new PriceService().quote(1000));

        // The fix: depend on an interface and pass it in.
        Flags off = name -> false;
        Flags on = name -> name.equals("new-pricing");
        System.out.println("off: " + new InjectedPriceService(off).quote(1000));
        System.out.println("on: " + new InjectedPriceService(on).quote(1000));
    }
}

// Problem: a classic eager Singleton holding mutable state.
final class FeatureFlags {
    private static final FeatureFlags INSTANCE = new FeatureFlags();
    private final Set<String> enabled = ConcurrentHashMap.newKeySet();
    private FeatureFlags() { }
    static FeatureFlags getInstance() { return INSTANCE; }
    void enable(String name) { enabled.add(name); }
    boolean isOn(String name) { return enabled.contains(name); }
}
// The dependency is invisible in the constructor signature.
final class PriceService {
    long quote(long base) {
        boolean on = FeatureFlags.getInstance().isOn("new-pricing");
        return on ? base * 90 / 100 : base;
    }
}

interface Flags { boolean isOn(String name); }
// The dependency is explicit, and each caller chooses its own.
final class InjectedPriceService {
    private final Flags flags;
    InjectedPriceService(Flags flags) {
        this.flags = Objects.requireNonNull(flags, "flags");
    }
    long quote(long base) {
        return flags.isOn("new-pricing") ? base * 90 / 100 : base;
    }
}
