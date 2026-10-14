import java.util.*;

public class HandBuiltLru {
  public static void main(String[] args) {
    LruCache<String, Integer> prices = new LruCache<>(3);
    prices.put("tea", 20);
    prices.put("coffee", 35);
    prices.put("juice", 50);
    System.out.println("start       " + prices);
    prices.get("tea");
    System.out.println("get tea     " + prices);
    prices.put("soda", 30);
    System.out.println("put soda    " + prices);
    prices.put("juice", 55);
    System.out.println("put juice   " + prices);
    prices.remove("tea");
    System.out.println("remove tea  " + prices);
    System.out.println("coffee -> " + prices.get("coffee").orElse(-1));
  }
}

interface Cache<K, V> {
  Optional<V> get(K key);
  void put(K key, V value);
  boolean remove(K key);
  int size();
}

class LruCache<K, V> implements Cache<K, V> {
  private static final class Node<K, V> {
    final K key;
    V value;
    Node<K, V> prev, next;
    Node(K key, V value) { this.key = key; this.value = value; }
  }
  private final Map<K, Node<K, V>> index = new HashMap<>();
  private final Node<K, V> head = new Node<>(null, null); // MRU side
  private final Node<K, V> tail = new Node<>(null, null); // LRU side
  private final int capacity;

  LruCache(int capacity) {
    if (capacity < 1) throw new IllegalArgumentException("capacity < 1");
    this.capacity = capacity;
    head.next = tail;
    tail.prev = head;
  }
  public Optional<V> get(K key) {
    Node<K, V> n = index.get(key);
    if (n == null) return Optional.empty();
    moveToFront(n);
    return Optional.of(n.value);
  }
  public void put(K key, V value) {
    Objects.requireNonNull(value, "null values are not cached");
    Node<K, V> n = index.get(key);
    if (n != null) {                 // replace: new value, now most recent
      n.value = value;
      moveToFront(n);
      return;
    }
    if (index.size() == capacity) {  // full: drop the node before tail
      Node<K, V> lru = tail.prev;
      unlink(lru);
      index.remove(lru.key);
    }
    n = new Node<>(key, value);
    linkFirst(n);
    index.put(key, n);
  }
  public boolean remove(K key) {
    Node<K, V> n = index.remove(key);
    if (n == null) return false;
    unlink(n);
    return true;
  }
  public int size() { return index.size(); }

  private void moveToFront(Node<K, V> n) { unlink(n); linkFirst(n); }
  private void linkFirst(Node<K, V> n) {
    n.prev = head;
    n.next = head.next;
    head.next.prev = n;
    head.next = n;
  }
  private void unlink(Node<K, V> n) {
    n.prev.next = n.next;
    n.next.prev = n.prev;
  }
  @Override public String toString() {     // most recent first
    StringJoiner out = new StringJoiner(", ", "[", "]");
    for (Node<K, V> n = head.next; n != tail; n = n.next)
      out.add(n.key + "=" + n.value);
    return out.toString();
  }
}
