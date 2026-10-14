import java.util.*;
import java.util.function.Predicate;

public class NotificationSystemDemo {
    public static void main(String[] args) {
        Set<String> optedOut = Set.of("bob"), sent = new HashSet<>();
        Rule rules = new Rule("opted out", n -> optedOut.contains(n.user()));
        rules.then(new Rule("quiet hours", n -> !n.urgent() && n.hour() >= 22))
             .then(new Rule("duplicate", n -> !sent.add(n.user() + n.event())));
        OrderEvents events = new OrderEvents();
        events.subscribe(new NotificationService(
            rules, new UrgencyPolicy(), new ChannelFactory()));
        events.publish(new Note("ann", "SHIPPED", false, 10));
        events.publish(new Note("ann", "PAY_FAILED", true, 23));
        events.publish(new Note("bob", "SHIPPED", false, 10));
        events.publish(new Note("ann", "SHIPPED", false, 11));
        events.publish(new Note("cat", "DELAYED", false, 23));
    }
}
record Note(String user, String event, boolean urgent, int hour) {
    Note {
        Objects.requireNonNull(user); Objects.requireNonNull(event);
        if (hour < 0 || hour > 23) throw new IllegalArgumentException("hour");
    }
}
interface OrderListener { void on(Note n); }                     // Observer
final class OrderEvents {
    private final List<OrderListener> listeners = new ArrayList<>();
    void subscribe(OrderListener l) {
        listeners.add(Objects.requireNonNull(l));
    }
    void publish(Note n) { listeners.forEach(l -> l.on(n)); }
}
final class Rule {                                   // Chain of Responsibility
    private final String reason;
    private final Predicate<Note> blocks;
    private Rule next;
    Rule(String reason, Predicate<Note> blocks) {
        this.reason = reason; this.blocks = Objects.requireNonNull(blocks);
    }
    Rule then(Rule next) { this.next = next; return next; }
    Optional<String> check(Note n) {
        if (blocks.test(n)) return Optional.of(reason);
        return next == null ? Optional.empty() : next.check(n);
    }
}
enum ChannelType { EMAIL, SMS, PUSH }
interface ChannelPolicy { List<ChannelType> pick(Note n); }       // Strategy
final class UrgencyPolicy implements ChannelPolicy {
    public List<ChannelType> pick(Note n) {
        return n.urgent() ? List.of(ChannelType.SMS, ChannelType.PUSH)
                          : List.of(ChannelType.EMAIL);
    }
}
interface Channel { void send(Note n); }
final class ChannelFactory {                                      // Factory
    Channel create(ChannelType type) {
        Channel base = switch (type) {
            case EMAIL -> n -> System.out.println("  email -> " + n.user());
            case PUSH -> n -> System.out.println("  push -> " + n.user());
            case SMS -> new FlakySms();
        };
        return new Retrying(base, 2);
    }
}
final class FlakySms implements Channel {     // times out once, to show retry
    private boolean failedOnce;
    public void send(Note n) {
        if (!failedOnce) {
            failedOnce = true;
            throw new IllegalStateException("timeout");
        }
        System.out.println("  sms -> " + n.user());
    }
}
final class Retrying implements Channel {                         // Decorator
    private final Channel inner;
    private final int attempts;
    Retrying(Channel inner, int attempts) {
        this.inner = Objects.requireNonNull(inner); this.attempts = attempts;
    }
    public void send(Note n) {
        for (int i = 1; ; i++) {
            try { inner.send(n); return; } catch (IllegalStateException e) {
                System.out.println("  attempt " + i + " failed");
                if (i == attempts) throw e;
            }
        }
    }
}
final class NotificationService implements OrderListener {
    private final Rule rules;
    private final ChannelPolicy policy;
    private final Map<ChannelType, Channel> channels =
        new EnumMap<>(ChannelType.class);
    NotificationService(Rule rules, ChannelPolicy policy, ChannelFactory f) {
        this.rules = Objects.requireNonNull(rules);
        this.policy = Objects.requireNonNull(policy);
        for (ChannelType t : ChannelType.values()) channels.put(t, f.create(t));
    }
    @Override public void on(Note n) {
        String what = n.user() + " " + n.event();
        Optional<String> veto = rules.check(n);
        if (veto.isPresent()) {
            System.out.println("skip " + what + ": " + veto.get());
            return;
        }
        System.out.println("send " + what);
        for (ChannelType t : policy.pick(n)) channels.get(t).send(n);
    }
}
