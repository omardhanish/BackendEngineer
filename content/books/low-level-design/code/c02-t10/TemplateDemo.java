import java.util.List;

public class TemplateDemo {
    public static void main(String[] args) {
        List<String> names = List.of("Ada", "Linus");
        new CsvExport().export(names);
        new JsonExport().export(names);
    }
}

abstract class Exporter {
    // The template method: fixed order, and final so no subclass changes it.
    final void export(List<String> rows) {
        System.out.println(header());
        for (int i = 0; i < rows.size(); i++) {
            boolean last = i == rows.size() - 1;
            System.out.println(row(rows.get(i), last));
        }
        String end = footer();
        if (!end.isEmpty()) System.out.println(end);
    }

    abstract String header();                     // step every subclass fills
    abstract String row(String value, boolean last);
    String footer() { return ""; }                // hook: optional override
}

class CsvExport extends Exporter {
    String header() { return "name"; }
    String row(String value, boolean last) { return value; }
}

class JsonExport extends Exporter {
    String header() { return "["; }
    String row(String value, boolean last) {
        return "  \"" + value + "\"" + (last ? "" : ",");
    }
    @Override
    String footer() { return "]"; }
}
