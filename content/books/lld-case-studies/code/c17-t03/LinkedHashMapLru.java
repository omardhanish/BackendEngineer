import java.util.*;

public class LinkedHashMapLru {
  public static void main(String[] args) {
    Map<String, Integer> prices = new LruMap<>(3);
    prices.put("tea", 20);
    prices.put("coffee", 35);
    prices.put("juice", 50);
    prices.get("tea");
    prices.put("soda", 30);
    prices.put("juice", 55);
    prices.remove("tea");
    System.out.println("oldest first " + prices.keySet());
    System.out.println("coffee -> " + prices.getOrDefault("coffee", -1));
  }
}

class LruMap<K, V> extends LinkedHashMap<K, V> {
  private final int capacity;
  LruMap(int capacity) {
    super(16, 0.75f, true);              // true = access order, not insert
    this.capacity = capacity;
  }
  @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
    return size() > capacity;            // runs after a new key is put
  }
}
