import java.util.ArrayList;
import java.util.List;

public class SwitchImporter {
    public static void main(String[] args) {
        ImportService service = new ImportService();
        System.out.println(service.importRows("csv", "id,name\n1,Ada"));
        System.out.println(service.importRows("json", "[{\"id\":1}]"));
        try {
            service.importRows("xml", "<r id='1'/>");
        } catch (IllegalArgumentException e) {
            System.out.println("failed: " + e.getMessage());
        }
    }
}

// Creation and use live in one method: every new format edits it.
final class ImportService {
    String importRows(String format, String text) {
        List<String> rows = new ArrayList<>();
        switch (format) {
            case "csv" -> {
                String[] lines = text.split("\n");
                for (int i = 1; i < lines.length; i++) rows.add(lines[i]);
            }
            case "json" -> {
                var m = java.util.regex.Pattern
                    .compile("\\{[^}]*\\}").matcher(text);
                while (m.find()) rows.add(m.group());
            }
            // "xml" needs a new case here, a retest of csv and json,
            // and a redeploy of the one class every format shares.
            default -> throw new IllegalArgumentException(
                "unknown format: " + format);
        }
        return format + ": " + rows.size() + " rows " + rows;
    }
}
