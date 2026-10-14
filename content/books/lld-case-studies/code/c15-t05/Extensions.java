import java.util.*;
import java.util.function.Function;

public class Extensions {
  public static void main(String[] args) {
    Map<String, Formatter> formats = new TreeMap<>();
    formats.put("plain", r -> r.level() + " " + r.message());
    formats.put("json", new JsonFormatter());        // added later, no edits
    Map<String, Function<Formatter, Appender>> types = new TreeMap<>();
    types.put("console", f -> r -> System.out.println("console| "
        + f.format(r)));
    types.put("alerts", f -> r -> System.out.println("alerts | "
        + f.format(r)));                              // a new provider

    Properties cfg = new Properties();               // from a config file
    cfg.setProperty("level", "INFO");
    cfg.setProperty("appenders", "console,alerts");
    cfg.setProperty("alerts.format", "json");
    cfg.setProperty("alerts.minLevel", "ERROR");

    Logger log = Logger.builder("checkout").fromConfig(cfg, types, formats)
        .build();
    log.log(LogLevel.DEBUG, "cart opened");
    log.log(LogLevel.INFO, "order OD-7 placed");
    log.log(LogLevel.ERROR, "card \"declined\"");
    cfg.setProperty("appenders", "console,kafka");  // typo or missing plugin
    try {
      Logger.builder("checkout").fromConfig(cfg, types, formats).build();
    } catch (IllegalArgumentException e) {
      System.out.println("config rejected: " + e.getMessage());
    }
  }
}

enum LogLevel { DEBUG, INFO, WARN, ERROR, FATAL }
record LogRecord(LogLevel level, String logger, String message) {}
interface Formatter { String format(LogRecord r); }
interface Appender { void append(LogRecord r); }

class JsonFormatter implements Formatter {           // strategy
  public String format(LogRecord r) {
    return "{\"level\":\"" + r.level() + "\",\"logger\":\""
        + esc(r.logger()) + "\",\"msg\":\"" + esc(r.message()) + "\"}";
  }
  static String esc(String s) {          // quotes, backslash, control chars
    StringBuilder b = new StringBuilder();
    for (char c : s.toCharArray()) {
      if (c == '"' || c == '\\') b.append('\\').append(c);
      else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
      else b.append(c);
    }
    return b.toString();
  }
}

class MinLevelAppender implements Appender {         // decorator
  private final Appender inner;
  private final LogLevel min;
  MinLevelAppender(Appender inner, LogLevel min) {
    this.inner = inner; this.min = min;
  }
  public void append(LogRecord r) {
    if (r.level().compareTo(min) >= 0) inner.append(r);
  }
}

class Logger {
  private final String name;
  private final LogLevel threshold;
  private final List<Appender> appenders;
  private Logger(Builder b) {
    name = b.name; threshold = b.level; appenders = List.copyOf(b.appenders);
  }
  static Builder builder(String name) { return new Builder(name); }
  void log(LogLevel l, String msg) {
    if (l.compareTo(threshold) < 0) return;
    LogRecord r = new LogRecord(l, name, msg);
    for (Appender a : appenders) a.append(r);
  }

  static class Builder {                             // builder
    private final String name;
    private LogLevel level = LogLevel.INFO;
    private final List<Appender> appenders = new ArrayList<>();
    Builder(String name) { this.name = name; }
    Builder level(LogLevel l) { level = l; return this; }
    Builder add(Appender a) { appenders.add(a); return this; }
    Builder fromConfig(Properties c, Map<String, Function<Formatter,
        Appender>> types, Map<String, Formatter> formats) {
      level(LogLevel.valueOf(c.getProperty("level", "INFO")));
      for (String id : c.getProperty("appenders", "").split(",")) {
        Formatter f = formats.get(c.getProperty(id + ".format", "plain"));
        Function<Formatter, Appender> type = types.get(id);
        if (type == null) {                            // fail at startup
          throw new IllegalArgumentException("unknown appender " + id);
        }
        if (f == null) {
          throw new IllegalArgumentException("unknown format for " + id);
        }
        Appender a = type.apply(f);
        String min = c.getProperty(id + ".minLevel");
        add(min == null ? a : new MinLevelAppender(a, LogLevel.valueOf(min)));
      }
      return this;
    }
    Logger build() { return new Logger(this); }
  }
}
