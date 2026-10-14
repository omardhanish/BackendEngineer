import java.util.*;
import java.util.function.Predicate;

public class ClassDesign {
  public static void main(String[] args) {
    EventBus bus = new EventBus();
    bus.createTopic("orders");
    Publisher checkout = bus.publisher("orders");
    bus.subscribe("orders", new Printer("email"), e -> true);
    Subscription refunds = bus.subscribe("orders", new Printer("refunds"),
        e -> e.payload().equals("cancelled"));
    checkout.publish("O-1", "placed");
    checkout.publish("O-1", "cancelled");
    bus.unsubscribe(refunds);
    checkout.publish("O-2", "cancelled");
    try {
      bus.publisher("payments");
    } catch (IllegalArgumentException ex) {
      System.out.println("refused: " + ex.getMessage());
    }
  }
}

record Event(String id, String topic, String key, String payload) {}

interface Subscriber {
  String name();
  void onEvent(Event event) throws Exception;   // throwing = not handled
}

record Printer(String name) implements Subscriber {
  public void onEvent(Event e) {
    System.out.println(name + " <- " + e.id() + " " + e.key() + " "
        + e.payload());
  }
}

class Subscription {
  final String topic;
  final Subscriber subscriber;
  final Predicate<Event> filter;
  Subscription(String topic, Subscriber s, Predicate<Event> filter) {
    this.topic = topic; this.subscriber = s; this.filter = filter;
  }
}

class Topic {
  final String name;
  private final List<Subscription> subscriptions = new ArrayList<>();
  Topic(String name) { this.name = name; }
  void add(Subscription s) { subscriptions.add(s); }
  void remove(Subscription s) { subscriptions.remove(s); }
  List<Subscription> subscriptions() { return List.copyOf(subscriptions); }
}

class Publisher {                       // bound to one topic
  private final EventBus bus;
  private final String topic;
  Publisher(EventBus bus, String topic) { this.bus = bus; this.topic = topic; }
  Event publish(String key, String payload) {
    return bus.publish(topic, key, payload);
  }
}

class EventBus {
  private final Map<String, Topic> topics = new LinkedHashMap<>();
  private long nextId = 1;

  void createTopic(String name) {
    if (topics.putIfAbsent(name, new Topic(name)) != null)
      throw new IllegalArgumentException("topic exists: " + name);
  }
  Publisher publisher(String topic) {
    topic(topic);                       // fail fast on a typo
    return new Publisher(this, topic);
  }
  Subscription subscribe(String topic, Subscriber s, Predicate<Event> f) {
    Subscription sub = new Subscription(topic, s, f);
    topic(topic).add(sub);
    return sub;
  }
  void unsubscribe(Subscription sub) { topic(sub.topic).remove(sub); }

  Event publish(String topic, String key, String payload) {
    Topic t = topic(topic);                     // unknown topic fails here
    Event e = new Event("EV-" + nextId++, topic, key, payload);
    for (Subscription s : t.subscriptions())
      if (s.filter.test(e)) deliver(s, e);
    return e;
  }
  private void deliver(Subscription s, Event e) {
    try { s.subscriber.onEvent(e); }
    catch (Exception ex) {
      System.out.println(s.subscriber.name() + " failed " + e.id());
    }
  }
  private Topic topic(String name) {
    Topic t = topics.get(name);
    if (t == null) throw new IllegalArgumentException("no topic " + name);
    return t;
  }
}
