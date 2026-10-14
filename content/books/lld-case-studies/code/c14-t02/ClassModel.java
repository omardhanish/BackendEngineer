import java.util.*;
import java.util.regex.*;

public class ClassModel {
  public static void main(String[] args) {
    Recipient ana = new Recipient("U-1", "ana@example.com", "+15550101",
        null);
    Template otp = new Template("otp-sms", Channel.SMS, "",
        "Hi {{name}}, your code is {{code}}");
    Notification n = new Notification("N-1", ana, otp,
        Map.of("name", "Ana", "code", "4821"), "login-U-1-77");
    System.out.println(n.id() + " " + n.status() + " to "
        + ana.address(Channel.SMS).orElse("-"));
    System.out.println("body: " + n.message().body());
    System.out.println("push address: "
        + ana.address(Channel.PUSH).orElse("none"));
    n.markSent("sms-a");
    System.out.println(n.id() + " " + n.status() + " via " + n.sentVia());
    try {
      new Notification("N-2", ana, otp, Map.of("name", "Ana"), "k2");
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum Channel { EMAIL, SMS, PUSH }

enum Status { PENDING, SENT, FAILED, SKIPPED }

record Recipient(String userId, String email, String phone,
    String deviceToken) {
  Optional<String> address(Channel c) {
    String a = c == Channel.EMAIL ? email
        : c == Channel.SMS ? phone : deviceToken;
    return Optional.ofNullable(a);
  }
}

record Message(String to, String subject, String body) {}

record Template(String id, Channel channel, String subject, String body) {
  private static final Pattern VAR = Pattern.compile("\\{\\{(\\w+)}}");

  String fill(String text, Map<String, String> params) {
    Matcher m = VAR.matcher(text);
    StringBuilder out = new StringBuilder();
    while (m.find()) {
      String v = params.get(m.group(1));
      if (v == null)
        throw new IllegalArgumentException("missing " + m.group(1));
      m.appendReplacement(out, Matcher.quoteReplacement(v));
    }
    return m.appendTail(out).toString();
  }
}

interface Provider {
  String name();
  Channel channel();
  boolean send(Message m);
}

class Notification {
  private final String id, idempotencyKey;
  private final Message message;
  private Status status = Status.PENDING;
  private String sentVia;

  Notification(String id, Recipient to, Template t,
      Map<String, String> params, String idempotencyKey) {
    this.id = id;
    this.idempotencyKey = idempotencyKey;
    String addr = to.address(t.channel()).orElseThrow(
        () -> new IllegalArgumentException("no " + t.channel()));
    this.message = new Message(addr, t.fill(t.subject(), params),
        t.fill(t.body(), params));
  }

  void markSent(String provider) {
    if (status != Status.PENDING)
      throw new IllegalStateException(status + " -> SENT");
    status = Status.SENT;
    sentVia = provider;
  }

  String id() { return id; }
  String key() { return idempotencyKey; }
  Status status() { return status; }
  Message message() { return message; }
  String sentVia() { return sentVia; }
}
