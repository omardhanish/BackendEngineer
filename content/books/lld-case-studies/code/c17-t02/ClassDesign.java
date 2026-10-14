import java.util.*;
import java.util.function.Consumer;

public class ClassDesign {
  public static void main(String[] args) {
    Cache<String, String> dishes = new BoundedCache<>(2, new LruPolicy<>(),
        key -> System.out.println("evicted " + key));
    dishes.put("dish:1", "Dosa");
    dishes.put("dish:2", "Idli");
    dishes.get("dish:1");                  // dish:1 is now most recent
    dishes.put("dish:3", "Vada");          // full: the LRU key leaves
    for (String k : List.of("dish:1", "dish:2", "dish:3"))
      System.out.println(k + " -> " + dishes.get(k).orElse("MISS"));
    System.out.println("size " + dishes.size());
    try {
      new BoundedCache<String, String>(0, new LruPolicy<>(), k -> {});
    } catch (IllegalArgumentException e) {
      System.out.println("refused: " + e.getMessage());
    }
  }
}

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
