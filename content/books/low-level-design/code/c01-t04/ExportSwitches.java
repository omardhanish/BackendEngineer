import java.util.List;

public class ExportSwitches {
    public static void main(String[] args) {
        List<String> rows = List.of("alice,3", "bob,5");
        for (String format : List.of("csv", "json", "xml")) {
            System.out.println("report." + extension(format));
            System.out.println(render(format, rows));
        }
    }

    // Decision 1: how to render. Somebody added "xml" here...
    static String render(String format, List<String> rows) {
        return switch (format) {
            case "csv" -> String.join("\n", rows);
            case "json" -> "[\"" + String.join("\",\"", rows) + "\"]";
            case "xml" -> "<rows>" + rows.size() + "</rows>";
            default -> throw new IllegalArgumentException(format);
        };
    }

    // Decision 2: the same choice again, in another place...
    // ...and forgot it here. The default hides the gap.
    static String extension(String format) {
        return switch (format) {
            case "json" -> "json";
            case "csv" -> "csv";
            default -> "txt";
        };
    }
}
