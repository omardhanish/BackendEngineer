import java.util.ArrayList;
import java.util.List;

public class LoggerDemo {
    public static void main(String[] args) {
        MemoryAppender memory = new MemoryAppender();
        Logger log = new Logger("checkout", Level.INFO, List.of(
                new ConsoleAppender(new PlainFormatter()), memory));
        log.debug("cart has 3 items");          // below INFO: dropped
        log.info("order A-17 placed");
        log.error("payment declined for A-18");
        System.out.println("memory holds " + memory.records().size());
    }
}

enum Level { DEBUG, INFO, WARN, ERROR }        // lowest first
record LogRecord(Level level, String logger, String message) {}

interface Formatter { String format(LogRecord r); }
interface Appender { void append(LogRecord r); }

class PlainFormatter implements Formatter {
    public String format(LogRecord r) {
        return "[" + r.level() + "] " + r.logger() + ": " + r.message();
    }
}

class ConsoleAppender implements Appender {
    private final Formatter formatter;
    ConsoleAppender(Formatter formatter) { this.formatter = formatter; }
    public void append(LogRecord r) { System.out.println(formatter.format(r)); }
}

class MemoryAppender implements Appender {
    private final List<LogRecord> records = new ArrayList<>();
    public synchronized void append(LogRecord r) { records.add(r); }
    synchronized List<LogRecord> records() { return List.copyOf(records); }
}

class Logger {
    private final String name;
    private final Level threshold;
    private final List<Appender> appenders;

    Logger(String name, Level threshold, List<Appender> appenders) {
        this.name = name;
        this.threshold = threshold;
        this.appenders = List.copyOf(appenders);
    }
    void debug(String msg) { log(Level.DEBUG, msg); }
    void info(String msg) { log(Level.INFO, msg); }
    void error(String msg) { log(Level.ERROR, msg); }

    void log(Level level, String msg) {
        if (level.compareTo(threshold) < 0) return;   // too quiet
        LogRecord r = new LogRecord(level, name, msg);
        for (Appender a : appenders) a.append(r);
    }
}
