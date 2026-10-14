import java.util.*;

public class NotificationCore {
  public static void main(String[] args) {
    FakeSms smsA = new FakeSms("sms-a", 2), smsB = new FakeSms("sms-b", 0);
    NotificationService svc = new NotificationService(
        Map.of(Channel.SMS, List.of(smsA, smsB)), 2,
        (user, ch) -> !(user.equals("U-2") && ch == Channel.EMAIL));
    print(svc.send(new Request("k1", "U-1", Channel.SMS, "+15550101")));
    print(svc.send(new Request("k1", "U-1", Channel.SMS, "+15550101")));
    print(svc.send(new Request("k2", "U-2", Channel.EMAIL, "b@x.io")));
    print(svc.send(new Request("k3", "U-3", Channel.SMS, "bad-number")));
    System.out.println("calls: sms-a=" + smsA.calls + " sms-b=" + smsB.calls);
  }

  static void print(Notification n) {
    System.out.println(n.id + " " + n.status + " " + n.attempts);
  }
}

enum Channel { EMAIL, SMS, PUSH }
enum Status { PENDING, SENT, FAILED, SKIPPED }
enum Result { OK, RETRYABLE, REJECTED }

record Request(String key, String userId, Channel channel, String to) {}

interface Provider { String name(); Result send(String to); }

interface Preferences { boolean allows(String userId, Channel c); }

class Notification {
  final String id;
  Status status = Status.PENDING;
  final List<String> attempts = new ArrayList<>();
  Notification(String id) { this.id = id; }
}

class NotificationService {
  private final Map<Channel, List<Provider>> providers;
  private final int triesPerProvider;
  private final Preferences prefs;
  private final Map<String, Notification> byKey = new HashMap<>();
  private int seq = 0;

  NotificationService(Map<Channel, List<Provider>> providers,
      int triesPerProvider, Preferences prefs) {
    this.providers = providers;
    this.triesPerProvider = triesPerProvider;
    this.prefs = prefs;
  }

  Notification send(Request r) {
    Notification seen = byKey.get(r.key());
    if (seen != null) return seen;                 // idempotent replay
    Notification n = new Notification("N-" + (++seq));
    byKey.put(r.key(), n);
    if (!prefs.allows(r.userId(), r.channel())) {
      n.status = Status.SKIPPED;
      return n;
    }
    for (Provider p : providers.getOrDefault(r.channel(), List.of())) {
      for (int t = 1; t <= triesPerProvider; t++) {
        Result res = p.send(r.to());
        n.attempts.add(p.name() + ":" + res);
        if (res == Result.OK) { n.status = Status.SENT; return n; }
        if (res == Result.REJECTED) { n.status = Status.FAILED; return n; }
      }                                            // RETRYABLE: try again
    }                                              // then next provider
    n.status = Status.FAILED;
    return n;
  }
}

class FakeSms implements Provider {
  private final String name;
  private int failuresLeft;
  int calls = 0;
  FakeSms(String name, int failures) {
    this.name = name;
    this.failuresLeft = failures;
  }
  public String name() { return name; }
  public Result send(String to) {
    calls++;
    if (!to.startsWith("+")) return Result.REJECTED;
    if (failuresLeft > 0) { failuresLeft--; return Result.RETRYABLE; }
    return Result.OK;
  }
}
