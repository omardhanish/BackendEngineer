import java.util.*;

public class LfuCacheDemo {
    public static void main(String[] args) {
        LfuCache<String, Integer> cache = new LfuCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        for (String k : List.of("a", "a", "b")) cache.get(k);
        cache.put("c", 3);                      // same calls as the LRU demo
        System.out.println("a -> " + cache.get("a"));
        System.out.println("b -> " + cache.get("b"));
    }
}

// Keys grouped by use count; each group keeps insertion order for ties.
class LfuCache<K, V> {
    private final int capacity;
    private final Map<K, V> values = new HashMap<>();
    private final Map<K, Integer> counts = new HashMap<>();
    private final Map<Integer, LinkedHashSet<K>> byCount = new HashMap<>();
    private int minCount = 0;

    LfuCache(int capacity) { this.capacity = capacity; }

    V get(K key) {
        if (!values.containsKey(key)) return null;   // miss
        bump(key);
        return values.get(key);
    }
    void put(K key, V value) {
        if (capacity == 0) return;
        if (values.containsKey(key)) {
            values.put(key, value);
            bump(key);
            return;
        }
        if (values.size() == capacity) {
            K victim = byCount.get(minCount).iterator().next(); // oldest
            byCount.get(minCount).remove(victim);
            values.remove(victim);
            counts.remove(victim);
            System.out.println("evict " + victim);
        }
        values.put(key, value);
        counts.put(key, 1);
        byCount.computeIfAbsent(1, c -> new LinkedHashSet<>()).add(key);
        minCount = 1;                           // a new key is always rarest
    }
    private void bump(K key) {
        int c = counts.merge(key, 1, Integer::sum) - 1;  // old count
        byCount.get(c).remove(key);
        if (c == minCount && byCount.get(c).isEmpty()) minCount = c + 1;
        byCount.computeIfAbsent(c + 1, x -> new LinkedHashSet<>()).add(key);
    }
}
