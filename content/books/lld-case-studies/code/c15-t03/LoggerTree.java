import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LoggerTree {
  public static void main(String[] args) {
    LogManager mgr = new LogManager(LogLevel.WARN);   // root level
    mgr.setLevel("app", LogLevel.INFO);
    mgr.setLevel("app.db", LogLevel.DEBUG);
    for (String n : new String[] {"app.db.pool", "app.web", "metrics"}) {
      Logger log = mgr.getLogger(n);
      System.out.println(n + " -> " + log.effectiveLevel()
          + ", debug on: " + log.isEnabled(LogLevel.DEBUG));
    }
    Logger web = mgr.getLogger("app.web");
    System.out.println("cached: " + (web == mgr.getLogger("app.web")));
    mgr.setLevel("app", LogLevel.ERROR);              // operator change
    System.out.println("app.web now -> " + web.effectiveLevel());
  }
}

enum LogLevel { DEBUG, INFO, WARN, ERROR, FATAL }

class LogManager {
  private final LogLevel rootLevel;
  private final Map<String, LogLevel> levels = new ConcurrentHashMap<>();
  private final Map<String, Logger> loggers = new ConcurrentHashMap<>();
  LogManager(LogLevel rootLevel) { this.rootLevel = rootLevel; }

  void setLevel(String name, LogLevel level) { levels.put(name, level); }

  Logger getLogger(String name) {                     // one per name
    return loggers.computeIfAbsent(name, n -> new Logger(n, this));
  }

  LogLevel levelFor(String name) {                    // walk up the dots
    String n = name;
    while (true) {
      LogLevel set = levels.get(n);
      if (set != null) return set;
      int dot = n.lastIndexOf('.');
      if (dot < 0) return rootLevel;
      n = n.substring(0, dot);                        // app.db.pool -> app.db
    }
  }
}

class Logger {
  private final String name;
  private final LogManager mgr;
  Logger(String name, LogManager mgr) { this.name = name; this.mgr = mgr; }
  LogLevel effectiveLevel() { return mgr.levelFor(name); }
  boolean isEnabled(LogLevel l) { return l.compareTo(effectiveLevel()) >= 0; }
}
