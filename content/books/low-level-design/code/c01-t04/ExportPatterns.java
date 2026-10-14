import java.util.List;
import java.util.Objects;

public class ExportPatterns {
    public static void main(String[] args) {
        List<String> rows = List.of("alice,3", "bob,5");
        for (String format : List.of("csv", "xml", "pdf")) {
            try {
                Exporter ex = new Titled("Scores", Exporters.forFormat(format));
                System.out.println("report." + ex.extension());
                System.out.println(ex.render(rows));
            } catch (IllegalArgumentException e) {
                System.out.println("Refused: " + e.getMessage());
            }
        }
    }
}

// Behavioural (Strategy): interchangeable ways to do one job.
// Each exporter owns BOTH decisions, so neither can be forgotten.
interface Exporter {
    String extension();
    String render(List<String> rows);
}

record Csv() implements Exporter {
    public String extension() { return "csv"; }
    public String render(List<String> rows) { return String.join("\n", rows); }
}

record Xml() implements Exporter {
    public String extension() { return "xml"; }
    public String render(List<String> rows) {
        return "<rows>" + rows.size() + "</rows>";
    }
}

// Creational (simple factory): the only place mapping a name to a class.
final class Exporters {
    private Exporters() {}
    static Exporter forFormat(String format) {
        return switch (Objects.requireNonNull(format, "format")) {
            case "csv" -> new Csv();
            case "xml" -> new Xml();
            default -> throw new IllegalArgumentException("no exporter: "
                    + format);
        };
    }
}

// Structural (Decorator): wraps any exporter, adds a title line.
record Titled(String title, Exporter inner) implements Exporter {
    Titled { Objects.requireNonNull(inner, "inner"); }
    public String extension() { return inner.extension(); }
    public String render(List<String> rows) {
        return "# " + title + "\n" + inner.render(rows);
    }
}
