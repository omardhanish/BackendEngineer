import java.util.List;

public class Requirements {
  public static void main(String[] args) {
    LogLevel threshold = LogLevel.WARN;          // set per logger in config
    System.out.println("threshold " + threshold);
    for (LogLevel level : LogLevel.values()) {
      String verdict = level.atLeast(threshold) ? "write" : "drop ";
      System.out.println(verdict + " " + level);
    }
    List<String> outOfScope = List.of("log shipping", "search UI",
        "retention jobs");
    System.out.println("v1 leaves out: " + outOfScope);
  }
}

enum LogLevel {
  DEBUG, INFO, WARN, ERROR, FATAL;               // declared low to high

  boolean atLeast(LogLevel other) {
    return this.ordinal() >= other.ordinal();
  }
}
