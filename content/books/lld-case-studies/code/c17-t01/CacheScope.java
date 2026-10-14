import java.util.*;

public class CacheScope {
  public static void main(String[] args) {
    Set<Req> v1 = EnumSet.range(Req.GET, Req.THREAD_SAFE);
    for (Req r : Req.values()) {
      String tag = v1.contains(r) ? "IN " : "OUT";
      System.out.printf("%s %-14s %s%n", tag, r.kind, r.text);
    }
  }
}

enum Req {
  GET("functional", "get(key) returns the value or a miss"),
  PUT("functional", "put(key, value) inserts or replaces"),
  REMOVE("functional", "remove(key) deletes one entry"),
  EVICT("functional", "a full cache evicts by a policy, LRU first"),
  TTL("functional", "an entry can expire after a time-to-live"),
  STATS("functional", "count hits, misses and evictions"),
  FAST("non-functional", "get and put in O(1) average time"),
  BOUNDED("non-functional", "never hold more than capacity entries"),
  THREAD_SAFE("non-functional", "correct under many threads at once"),
  PERSIST("functional", "survive a process restart"),
  CLUSTER("non-functional", "share one cache across many servers");

  final String kind, text;
  Req(String kind, String text) { this.kind = kind; this.text = text; }
}
