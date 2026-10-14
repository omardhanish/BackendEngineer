import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class PluginRegistryDemo {
    public static void main(String[] args) {
        var registry = new ExporterRegistry();
        registry.register(new CsvExporter());
        registry.register(new JsonExporter());   // new format: no core edit
        var rows = List.of("ada", "linus");

        System.out.println("formats=" + registry.formats());
        for (String format : registry.formats()) {
            String out = registry.get(format).export(rows);
            System.out.println(format + " -> " + out);
        }
        try {
            registry.register(new CsvExporter());
        } catch (IllegalStateException e) {
            System.out.println("error: " + e.getMessage());
        }
        try {
            registry.get("xml");
        } catch (IllegalArgumentException e) {
            System.out.println("error: " + e.getMessage());
        }
    }
}

interface Exporter {                          // the extension point
    String format();
    String export(List<String> rows);
}

final class ExporterRegistry {                // the host knows only Exporter
    private final Map<String, Exporter> byFormat = new TreeMap<>();

    void register(Exporter exporter) {
        Objects.requireNonNull(exporter, "exporter");
        String key = exporter.format();
        if (byFormat.putIfAbsent(key, exporter) != null) {
            throw new IllegalStateException("duplicate format " + key);
        }
    }
    Exporter get(String format) {
        Exporter e = byFormat.get(format);
        if (e == null) throw new IllegalArgumentException(
            "no exporter for " + format + ", have " + formats());
        return e;
    }
    List<String> formats() { return List.copyOf(byFormat.keySet()); }
}

final class CsvExporter implements Exporter {
    public String format() { return "csv"; }
    public String export(List<String> rows) { return String.join(",", rows); }
}

final class JsonExporter implements Exporter {
    public String format() { return "json"; }
    public String export(List<String> rows) {
        return rows.stream().map(r -> "\"" + r + "\"")
            .collect(Collectors.joining(",", "[", "]"));
    }
}
