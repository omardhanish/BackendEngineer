import java.util.*;

public class LruCacheDemo {
    public static void main(String[] args) {
        LruCache<String, Integer> cache = new LruCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        for (String k : List.of("a", "a", "b")) cache.get(k);
        cache.put("c", 3);                      // full: one key must go
        System.out.println("a -> " + cache.get("a"));
        System.out.println("b -> " + cache.get("b"));
    }
}

// The map finds a node in O(1); the linked list keeps recency order.
class LruCache<K, V> {
    private final class Node { K key; V value; Node prev, next; }
    private final int capacity;
    private final Map<K, Node> index = new HashMap<>();
    private final Node head = new Node(), tail = new Node(); // sentinels

    LruCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }
    V get(K key) {
        Node n = index.get(key);
        if (n == null) return null;             // miss
        unlink(n);
        pushFront(n);                           // now most recent
        return n.value;
    }
    void put(K key, V value) {
        Node n = index.get(key);
        if (n != null) unlink(n);
        else if (index.size() == capacity) {
            Node old = tail.prev;               // least recent
            unlink(old);
            index.remove(old.key);
            System.out.println("evict " + old.key);
        }
        if (n == null) { n = new Node(); n.key = key; index.put(key, n); }
        n.value = value;
        pushFront(n);
    }
    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void pushFront(Node n) {
        n.next = head.next; n.prev = head; head.next.prev = n; head.next = n;
    }
}
