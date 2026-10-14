import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class LoggerModel {
  public static void main(String[] args) {
    List<String> sink = new ArrayList<>();          // stands in for stdout
    Formatter plain = r -> r.level() + " " + r.logger() + " - "
        + r.message();
    Logger log = new Logger("orders", LogLevel.INFO,
        List.of(new ListAppender(sink, plain)));
    log.log(LogLevel.DEBUG, "cart loaded");          // below threshold
    log.log(LogLevel.ERROR, "payment declined");
    sink.forEach(System.out::println);
    try {
      new LogRecord(null, "orders", "x", Instant.EPOCH, "main");
    } catch (NullPointerException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum LogLevel { DEBUG, INFO, WARN, ERROR, FATAL }

record LogRecord(LogLevel level, String logger, String message,
                 Instant time, String thread) {
  LogRecord {                                        // invariants
    Objects.requireNonNull(level, "level is required");
    Objects.requireNonNull(logger, "logger is required");
    message = message == null ? "" : message;
  }
}

interface Formatter { String format(LogRecord r); }

interface Appender { void append(LogRecord r); }

class ListAppender implements Appender {             // has-a Formatter
  private final List<String> out;
  private final Formatter formatter;
  ListAppender(List<String> out, Formatter f) { this.out = out; formatter = f; }
  public void append(LogRecord r) { out.add(formatter.format(r)); }
}

class Logger {                                       // has many Appenders
  private final String name;
  private final LogLevel threshold;
  private final List<Appender> appenders;
  Logger(String name, LogLevel threshold, List<Appender> appenders) {
    this.name = name;
    this.threshold = threshold;
    this.appenders = List.copyOf(appenders);
  }
  void log(LogLevel level, String msg) {
    if (level.compareTo(threshold) < 0) return;
    LogRecord r = new LogRecord(level, name, msg, Instant.EPOCH, "main");
    for (Appender a : appenders) a.append(r);
  }
}
