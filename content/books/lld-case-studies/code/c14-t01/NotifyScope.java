import java.util.*;

public class NotifyScope {
  static final Set<Kind> V1 =
      EnumSet.of(Kind.OTP, Kind.ORDER_UPDATE, Kind.PROMOTION);

  public static void main(String[] args) {
    for (Kind k : Kind.values()) {
      String scope = V1.contains(k) ? "IN " : "OUT";
      System.out.printf("%s %-13s %-8s optOut=%-5s %s%n", scope, k,
          k.priority, k.optOut, k.channels);
    }
  }
}

enum Channel { EMAIL, SMS, PUSH }

enum Priority { CRITICAL, NORMAL, LOW }

enum Kind {
  OTP(Priority.CRITICAL, false, List.of(Channel.SMS)),
  ORDER_UPDATE(Priority.NORMAL, false, List.of(Channel.PUSH, Channel.EMAIL)),
  PROMOTION(Priority.LOW, true, List.of(Channel.EMAIL, Channel.PUSH)),
  WEEKLY_DIGEST(Priority.LOW, true, List.of(Channel.EMAIL)),
  IN_APP_INBOX(Priority.NORMAL, true, List.of());

  final Priority priority;
  final boolean optOut;
  final List<Channel> channels;

  Kind(Priority p, boolean optOut, List<Channel> channels) {
    this.priority = p;
    this.optOut = optOut;
    this.channels = channels;
  }
}
