import java.util.*;

public class FilterChain {
  public static void main(String[] args) {
    NotificationService svc = NotificationService.builder()
        .filter(new OptOutFilter(Set.of("U-9")))
        .filter(new QuietHoursFilter(22, 7))        // added later
        .build();
    List<Request> reqs = List.of(
        new Request("U-1", Priority.CRITICAL, 23),
        new Request("U-1", Priority.LOW, 23),
        new Request("U-9", Priority.LOW, 10),
        new Request("U-2", Priority.LOW, 10));
    for (Request r : reqs) System.out.println(r + " -> " + svc.send(r));
  }
}

enum Priority { CRITICAL, LOW }

record Request(String user, Priority priority, int hour) {}

interface NotificationFilter { Optional<String> reject(Request r); }

class OptOutFilter implements NotificationFilter {
  private final Set<String> optedOut;
  OptOutFilter(Set<String> optedOut) { this.optedOut = Set.copyOf(optedOut); }
  public Optional<String> reject(Request r) {
    return optedOut.contains(r.user())
        ? Optional.of("opted out") : Optional.empty();
  }
}

class QuietHoursFilter implements NotificationFilter {   // new class only
  private final int from, to;
  QuietHoursFilter(int from, int to) { this.from = from; this.to = to; }
  public Optional<String> reject(Request r) {
    boolean quiet = r.hour() >= from || r.hour() < to;
    return quiet && r.priority() != Priority.CRITICAL
        ? Optional.of("quiet hours") : Optional.empty();
  }
}

class NotificationService {
  private final List<NotificationFilter> filters;
  private NotificationService(List<NotificationFilter> filters) {
    this.filters = List.copyOf(filters);
  }
  static Builder builder() { return new Builder(); }

  String send(Request r) {
    for (NotificationFilter f : filters) {
      Optional<String> why = f.reject(r);
      if (why.isPresent()) return "SKIPPED (" + why.get() + ")";
    }
    return "SENT";                      // providers: see ProviderConfig
  }

  static class Builder {
    private final List<NotificationFilter> filters = new ArrayList<>();
    Builder filter(NotificationFilter f) { filters.add(f); return this; }
    NotificationService build() { return new NotificationService(filters); }
  }
}
