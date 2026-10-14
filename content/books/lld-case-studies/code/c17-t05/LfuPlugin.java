import java.util.*;
import java.util.function.Consumer;

public class LfuPlugin {
  public static void main(String[] args) {
    for (String name : List.of("LRU", "LFU")) {
      EvictionPolicy<String> policy =
          name.equals("LRU") ? new LruPolicy<>() : new LfuPolicy<>();
      CountingCache<String, String> pages = new CountingCache<>(
          new BoundedCache<>(2, policy,
              key -> System.out.println(name + " evicts " + key)));
      pages.put("home", "<h1>Home</h1>");
      for (int i = 0; i < 3; i++) pages.get("home");   // home is popular
      pages.put("promo", "<h1>Sale</h1>");
      pages.get("promo");                               // promo is recent
      pages.put("about", "<h1>About</h1>");             // full: evict one
      pages.get("home");
      System.out.println(name + " " + pages.stats());
    }
  }
}

class LfuPolicy<K> implements EvictionPolicy<K> {    // new class, no edits
  private final Map<K, Integer> uses = new HashMap<>();
  private final TreeMap<Integer, LinkedHashSet<K>> byUses = new TreeMap<>();
  public void recordPut(K key) { bump(key); }
  public void recordGet(K key) { bump(key); }
  public void recordRemove(K key) {
    Integer n = uses.remove(key);
    if (n != null) detach(key, n);
  }
  public K victim() {          // fewest uses; oldest among a tie
    return byUses.firstEntry().getValue().iterator().next();
  }
  private void bump(K key) {
    Integer n = uses.get(key);
    if (n != null) detach(key, n);
    int next = n == null ? 1 : n + 1;
    uses.put(key, next);
    byUses.computeIfAbsent(next, x -> new LinkedHashSet<>()).add(key);
  }
  private void detach(K key, int n) {
    Set<K> keys = byUses.get(n);
    keys.remove(key);
    if (keys.isEmpty()) byUses.remove(n);
  }
}

class CountingCache<K, V> implements Cache<K, V> {   // decorator
  private final Cache<K, V> inner;
  private long hits, misses;
  CountingCache(Cache<K, V> inner) { this.inner = inner; }
  public Optional<V> get(K key) {
    Optional<V> value = inner.get(key);
    if (value.isPresent()) hits++; else misses++;
    return value;
  }
  public void put(K key, V value) { inner.put(key, value); }
  public boolean remove(K key) { return inner.remove(key); }
  public int size() { return inner.size(); }
  String stats() { return "hits=" + hits + " misses=" + misses; }
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
