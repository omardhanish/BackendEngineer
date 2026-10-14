import java.util.*;

public class BusScope {
  public static void main(String[] args) {
    Map<Kind, List<Need>> byKind = new EnumMap<>(Kind.class);
    for (Need n : Need.values())
      byKind.computeIfAbsent(n.kind, k -> new ArrayList<>()).add(n);
    byKind.forEach((kind, needs) -> {
      System.out.println(kind + " (" + needs.size() + ")");
      for (Need n : needs) System.out.println("  " + n.text);
    });
    String[] asks = { "PUBLISH", "EXACTLY_ONCE", "KEY_ORDER" };
    for (String ask : asks) {
      Need n = Need.valueOf(ask);
      boolean v1 = n.kind != Kind.OUT_OF_SCOPE;
      System.out.println(ask + " in v1? " + (v1 ? "yes" : "no"));
    }
  }
}

enum Kind { FUNCTIONAL, QUALITY, OUT_OF_SCOPE }

enum Need {
  CREATE_TOPIC(Kind.FUNCTIONAL, "create a named topic"),
  PUBLISH(Kind.FUNCTIONAL, "publish a keyed event to a topic"),
  SUBSCRIBE(Kind.FUNCTIONAL, "subscribe a handler, with an optional filter"),
  UNSUBSCRIBE(Kind.FUNCTIONAL, "unsubscribe one handler, others untouched"),
  DEAD_LETTER(Kind.FUNCTIONAL, "park events that keep failing"),
  AT_LEAST_ONCE(Kind.QUALITY, "every subscriber gets each event 1+ times"),
  KEY_ORDER(Kind.QUALITY, "same key, same order, per subscriber"),
  ISOLATION(Kind.QUALITY, "a slow subscriber never stalls the others"),
  THREAD_SAFE(Kind.QUALITY, "publish and subscribe from any thread"),
  DURABLE(Kind.OUT_OF_SCOPE, "keep events across a process restart"),
  CLUSTER(Kind.OUT_OF_SCOPE, "brokers spread over many machines"),
  EXACTLY_ONCE(Kind.OUT_OF_SCOPE, "exactly-once delivery");

  final Kind kind;
  final String text;
  Need(Kind kind, String text) { this.kind = kind; this.text = text; }
}
