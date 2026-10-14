import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class CoreLogger {
  public static void main(String[] args) throws IOException {
    Clock clock = Clock.fixed(Instant.parse("2026-01-15T10:00:00Z"),
        ZoneOffset.UTC);
    Path path = Files.createTempFile("app", ".log");
    Formatter fmt = new PatternFormatter();
    try (FileAppender file = new FileAppender(path, fmt)) {
      Logger log = new Logger("orders", LogLevel.INFO, clock, List.of(
          new ConsoleAppender(System.out, fmt), new BrokenAppender(), file));
      log.debug(() -> "cart " + expensiveDump());   // never built
      log.info(() -> "order OD-1 placed");
      log.error(() -> "payment failed for OD-1");
      System.out.println("failed appends: " + log.failedAppends());
    }
    System.out.println("file has " + Files.readAllLines(path));
    Files.delete(path);
  }
  static String expensiveDump() { throw new AssertionError("built"); }
}

enum LogLevel { DEBUG, INFO, WARN, ERROR, FATAL }

record LogRecord(LogLevel level, String logger, String message,
                 Instant time, String thread) {}

interface Formatter { String format(LogRecord r); }
interface Appender { void append(LogRecord r) throws IOException; }

class PatternFormatter implements Formatter {
  public String format(LogRecord r) {
    return r.time() + " " + String.format("%-5s", r.level()) + " ["
        + r.thread() + "] " + r.logger() + " - " + r.message();
  }
}

class ConsoleAppender implements Appender {
  private final PrintStream out;
  private final Formatter fmt;
  ConsoleAppender(PrintStream out, Formatter fmt) {
    this.out = out; this.fmt = fmt;
  }
  public void append(LogRecord r) { out.println(fmt.format(r)); }
}

class FileAppender implements Appender, Closeable {
  private final Writer writer;
  private final Formatter fmt;
  FileAppender(Path path, Formatter fmt) throws IOException {
    this.writer = Files.newBufferedWriter(path, StandardOpenOption.APPEND);
    this.fmt = fmt;
  }
  public void append(LogRecord r) throws IOException {
    writer.write(fmt.format(r) + System.lineSeparator());
    if (r.level().compareTo(LogLevel.ERROR) >= 0) writer.flush();
  }
  public void close() throws IOException { writer.close(); }
}

class BrokenAppender implements Appender {         // e.g. disk full
  public void append(LogRecord r) throws IOException {
    throw new IOException("no space left");
  }
}

class Logger {
  private final String name;
  private volatile LogLevel threshold;
  private final Clock clock;
  private final List<Appender> appenders;
  private final AtomicInteger failed = new AtomicInteger();
  Logger(String name, LogLevel t, Clock clock, List<Appender> appenders) {
    this.name = name; this.threshold = t; this.clock = clock;
    this.appenders = List.copyOf(appenders);
  }
  void debug(Supplier<String> m) { log(LogLevel.DEBUG, m); }
  void info(Supplier<String> m) { log(LogLevel.INFO, m); }
  void error(Supplier<String> m) { log(LogLevel.ERROR, m); }
  int failedAppends() { return failed.get(); }
  void setLevel(LogLevel t) { threshold = t; }

  void log(LogLevel level, Supplier<String> msg) {
    if (level.compareTo(threshold) < 0) return;    // cheap exit first
    LogRecord r = new LogRecord(level, name, msg.get(), clock.instant(),
        Thread.currentThread().getName());
    for (Appender a : appenders) {
      try { a.append(r); }
      catch (IOException | RuntimeException e) { failed.incrementAndGet(); }
    }
  }
}
