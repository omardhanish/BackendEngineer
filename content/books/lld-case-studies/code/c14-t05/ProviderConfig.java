import java.util.*;
import java.util.function.Supplier;

public class ProviderConfig {
  public static void main(String[] args) {
    Map<String, Supplier<Provider>> registry = new LinkedHashMap<>();
    registry.put("vendor-a", () -> new FakeVendor("vendor-a", 0));
    registry.put("vendor-b", () -> new FakeVendor("vendor-b", 1));
    registry.put("vendor-c", () -> new FakeVendor("vendor-c", 9)); // new
    for (String config : List.of("vendor-b,vendor-a", "vendor-c,vendor-a")) {
      List<Provider> chain = wire(config, registry, 2);
      System.out.println("config " + config + ":");
      for (Provider p : chain) {
        if (p.send("+15550101")) break;
      }
    }
  }

  static List<Provider> wire(String csv, Map<String, Supplier<Provider>> reg,
      int tries) {
    List<Provider> out = new ArrayList<>();
    for (String name : csv.split(",")) {
      Supplier<Provider> make = reg.get(name);
      if (make == null) throw new IllegalArgumentException("unknown " + name);
      out.add(new RetryingProvider(make.get(), tries));   // decorate
    }
    return List.copyOf(out);
  }
}

interface Provider { boolean send(String to); }

class RetryingProvider implements Provider {             // decorator
  private final Provider inner;
  private final int tries;
  RetryingProvider(Provider inner, int tries) {
    this.inner = inner;
    this.tries = tries;
  }
  public boolean send(String to) {
    for (int t = 1; t <= tries; t++) if (inner.send(to)) return true;
    return false;
  }
}

class FakeVendor implements Provider {
  private final String name;
  private int failuresLeft;
  FakeVendor(String name, int failures) {
    this.name = name;
    this.failuresLeft = failures;
  }
  public boolean send(String to) {
    boolean ok = failuresLeft == 0;
    if (!ok) failuresLeft--;
    System.out.println("  " + name + " -> " + (ok ? "OK" : "RETRYABLE"));
    return ok;
  }
}
