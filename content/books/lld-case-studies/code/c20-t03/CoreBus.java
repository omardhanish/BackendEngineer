import java.util.*;
import java.util.function.Consumer;
import java.util.function.Predicate;

public class CoreBus {
  public static void main(String[] args) {
    EventBus bus = new EventBus(3, System.out::println);
    bus.createTopic("orders");
    bus.subscribe("orders", new Flaky("email", Set.of(), Set.of()), e -> true);
    bus.subscribe("orders",
        new Flaky("billing", Set.of("EV-1"), Set.of("EV-4")), e -> true);
    Publisher p = bus.publisher("orders");
    p.publish("O-1", "placed");
    p.publish("O-1", "paid");
    p.publish("O-2", "placed");
    p.publish("O-3", "placed");
    for (int pass = 1; bus.pending() > 0; pass++) {
      System.out.println("-- pass " + pass);
      bus.dispatchOnce();
    }
    bus.deadLetters().forEach(d -> System.out.println("dead letter: " + d));
  }
}

record Event(String id, String topic, String key, String payload) {}
record DeadLetter(String subscriber, Event event, int attempts,
    String error) {}

interface Subscriber {
  String name();
  void onEvent(Event event) throws Exception;   // return = ack
}

class Flaky implements Subscriber {   // demo: fails once, or always
  private final String name;
  private final Set<String> failOnce, failAlways, failed = new HashSet<>();
  Flaky(String name, Set<String> failOnce, Set<String> failAlways) {
    this.name = name; this.failOnce = failOnce; this.failAlways = failAlways;
  }
  public String name() { return name; }
  public void onEvent(Event e) {
    if (failAlways.contains(e.id())) throw new IllegalStateException("bad");
    if (failOnce.contains(e.id()) && failed.add(e.id()))
      throw new IllegalStateException("timeout");
    System.out.println(name + " ok " + e.id() + " " + e.key() + " "
        + e.payload());
  }
}

class Delivery {
  final Event event;
  int attempts;
  Delivery(Event event) { this.event = event; }
}

class Subscription {
  final Subscriber subscriber;
  final Predicate<Event> filter;
  final Deque<Delivery> pending = new ArrayDeque<>();   // FIFO mailbox
  Subscription(Subscriber s, Predicate<Event> f) { subscriber = s; filter = f; }
}

class Publisher {
  private final EventBus bus;
  private final String topic;
  Publisher(EventBus bus, String topic) { this.bus = bus; this.topic = topic; }
  Event publish(String key, String payload) {
    return bus.publish(topic, key, payload);
  }
}

class EventBus {
  private final Map<String, List<Subscription>> topics = new LinkedHashMap<>();
  private final List<DeadLetter> deadLetters = new ArrayList<>();
  private final int maxAttempts;
  private final Consumer<String> log;
  private long nextId = 1;

  EventBus(int maxAttempts, Consumer<String> log) {
    if (maxAttempts < 1) throw new IllegalArgumentException("maxAttempts");
    this.maxAttempts = maxAttempts; this.log = log;
  }
  void createTopic(String name) { topics.putIfAbsent(name, new ArrayList<>()); }
  Publisher publisher(String topic) {
    subs(topic);
    return new Publisher(this, topic);
  }
  void subscribe(String topic, Subscriber s, Predicate<Event> filter) {
    subs(topic).add(new Subscription(s, filter));
  }
  Event publish(String topic, String key, String payload) {
    Event e = new Event("EV-" + nextId++, topic, key, payload);
    for (Subscription s : subs(topic))          // fan out: one Delivery each
      if (s.filter.test(e)) s.pending.add(new Delivery(e));
    return e;
  }
  void dispatchOnce() {
    for (List<Subscription> list : topics.values())
      for (Subscription s : list) drain(s);
  }
  private void drain(Subscription s) {
    String who = s.subscriber.name();
    Set<String> blocked = new HashSet<>();      // keys with a failure
    Deque<Delivery> later = new ArrayDeque<>();
    while (!s.pending.isEmpty()) {
      Delivery d = s.pending.poll();
      String key = d.event.key();
      if (blocked.contains(key)) {              // keep per-key order
        log.accept(who + " holds " + d.event.id() + ", key " + key);
        later.add(d);
        continue;
      }
      d.attempts++;
      try {
        s.subscriber.onEvent(d.event);          // no exception = ack
      } catch (Exception ex) {
        String id = d.event.id();
        if (d.attempts >= maxAttempts) {
          deadLetters.add(new DeadLetter(who, d.event, d.attempts,
              ex.getMessage()));
          log.accept(who + " gives up on " + id);
        } else {
          log.accept(who + " failed " + id + " try " + d.attempts);
          later.add(d);
          blocked.add(key);
        }
      }
    }
    s.pending.addAll(later);                    // retried next pass
  }
  int pending() {
    int n = 0;
    for (List<Subscription> list : topics.values())
      for (Subscription s : list) n += s.pending.size();
    return n;
  }
  List<DeadLetter> deadLetters() { return List.copyOf(deadLetters); }
  private List<Subscription> subs(String topic) {
    List<Subscription> list = topics.get(topic);
    if (list == null) throw new IllegalArgumentException("no topic " + topic);
    return list;
  }
}
