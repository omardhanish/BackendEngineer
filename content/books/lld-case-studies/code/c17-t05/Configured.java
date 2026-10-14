import java.util.*;
import java.util.function.*;

public class Configured {
  public static void main(String[] args) {
    long[] now = {0};                               // fake clock, in ms
    Cache<String, String> sessions = new CacheBuilder<String, String>()
        .capacity(100).ttlMillis(30_000).clock(() -> now[0]).build();
    sessions.put("s-1", "user:42");
    now[0] = 29_999;
    System.out.println("29999 ms -> " + sessions.get("s-1").orElse("MISS"));
    now[0] = 30_000;
    System.out.println("30000 ms -> " + sessions.get("s-1").orElse("MISS"));
    System.out.println("size after expiry = " + sessions.size());
    try {
      new CacheBuilder<String, String>().ttlMillis(-1).build();
    } catch (IllegalArgumentException e) {
      System.out.println("refused: " + e.getMessage());
    }
  }
}

class CacheBuilder<K, V> {
  private int capacity = 1_000;
  private Supplier<EvictionPolicy<K>> policy = LruPolicy::new;
  private long ttlMillis;                         // 0 = never expires
  private LongSupplier clock = System::currentTimeMillis;
  private Consumer<K> onEvict = key -> {};

  CacheBuilder<K, V> capacity(int n) { capacity = n; return this; }
  CacheBuilder<K, V> policy(Supplier<EvictionPolicy<K>> p) {
    policy = p;
    return this;
  }
  CacheBuilder<K, V> ttlMillis(long ms) { ttlMillis = ms; return this; }
  CacheBuilder<K, V> clock(LongSupplier c) { clock = c; return this; }
  CacheBuilder<K, V> onEvict(Consumer<K> l) { onEvict = l; return this; }

  Cache<K, V> build() {
    if (ttlMillis < 0) throw new IllegalArgumentException("ttlMillis < 0");
    if (ttlMillis == 0)
      return new BoundedCache<>(capacity, policy.get(), onEvict);
    Cache<K, Stamped<V>> inner =
        new BoundedCache<>(capacity, policy.get(), onEvict);
    return new TtlCache<>(inner, ttlMillis, clock);
  }
}

record Stamped<V>(V value, long expiresAt) {}

class TtlCache<K, V> implements Cache<K, V> {        // decorator
  private final Cache<K, Stamped<V>> inner;
  private final long ttlMillis;
  private final LongSupplier clock;
  TtlCache(Cache<K, Stamped<V>> inner, long ttlMillis, LongSupplier clock) {
    this.inner = inner;
    this.ttlMillis = ttlMillis;
    this.clock = clock;
  }
  public Optional<V> get(K key) {
    Optional<Stamped<V>> s = inner.get(key);
    if (s.isPresent() && s.get().expiresAt() <= clock.getAsLong()) {
      inner.remove(key);                          // lazy expiry on read
      return Optional.empty();
    }
    return s.map(Stamped::value);
  }
  public void put(K key, V value) {
    inner.put(key, new Stamped<>(value, clock.getAsLong() + ttlMillis));
  }
  public boolean remove(K key) { return inner.remove(key); }
  public int size() { return inner.size(); }
}

// ---- core from the class design page, unchanged ----
interface Cache<K, V> {
  Optional<V> get(K key);
  void put(K key, V value);
  boolean remove(K key);
  int size();
}

interface EvictionPolicy<K> {
  void recordPut(K key);     // a key was added or replaced
  void recordGet(K key);     // a key was read (a hit)
  void recordRemove(K key);  // a key left the cache
  K victim();                // the key to evict next
}

class LruPolicy<K> implements EvictionPolicy<K> {
  private final LinkedHashSet<K> order = new LinkedHashSet<>(); // oldest 1st
  public void recordPut(K key) { order.remove(key); order.add(key); }
  public void recordGet(K key) { recordPut(key); }
  public void recordRemove(K key) { order.remove(key); }
  public K victim() { return order.iterator().next(); }
}

class BoundedCache<K, V> implements Cache<K, V> {
  private final Map<K, V> store = new HashMap<>();
  private final int capacity;
  private final EvictionPolicy<K> policy;
  private final Consumer<K> onEvict;

  BoundedCache(int capacity, EvictionPolicy<K> policy, Consumer<K> onEvict) {
    if (capacity < 1) throw new IllegalArgumentException("capacity < 1");
    this.capacity = capacity;
    this.policy = Objects.requireNonNull(policy);
    this.onEvict = Objects.requireNonNull(onEvict);
  }
  public Optional<V> get(K key) {
    V value = store.get(key);
    if (value != null) policy.recordGet(key);
    return Optional.ofNullable(value);
  }
  public void put(K key, V value) {
    Objects.requireNonNull(value, "null values are not cached");
    if (!store.containsKey(key) && store.size() == capacity) {
      K old = policy.victim();
      store.remove(old);
      policy.recordRemove(old);
      onEvict.accept(old);
    }
    store.put(key, value);
    policy.recordPut(key);
  }
  public boolean remove(K key) {
    if (store.remove(key) == null) return false;
    policy.recordRemove(key);
    return true;
  }
  public int size() { return store.size(); }
}
