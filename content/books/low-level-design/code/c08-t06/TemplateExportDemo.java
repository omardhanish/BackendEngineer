import java.util.List;
import java.util.Objects;

public class TemplateExportDemo {
    public static void main(String[] args) {
        List<Sale> sales = List.of(
            new Sale("pen", 3), new Sale("ink", -1), new Sale("pad", 2));
        List<ReportExporter> exporters =
            List.of(new CsvExporter(), new MarkdownExporter());
        for (ReportExporter exporter : exporters) {
            System.out.println(exporter.export(sales));
            System.out.println("--");
        }
    }
}

record Sale(String item, int qty) {
    Sale { Objects.requireNonNull(item, "item"); }
}

abstract class ReportExporter {
    // The template method: fixed order, and final so no subclass reorders it
    public final String export(List<Sale> sales) {
        Objects.requireNonNull(sales, "sales");
        StringBuilder out = new StringBuilder(header());
        int total = 0;
        for (Sale s : sales) {
            if (s.qty() < 0) continue; // the rule lives in one place
            out.append(row(s));
            total += s.qty();
        }
        return out.append(footer(total)).toString().strip();
    }
    protected abstract String header();      // required step
    protected abstract String row(Sale s);   // required step
    protected String footer(int total) {     // optional hook
        return "";
    }
}

final class CsvExporter extends ReportExporter {
    @Override protected String header() { return "item,qty\n"; }
    @Override protected String row(Sale s) {
        return s.item() + "," + s.qty() + "\n";
    }
}

final class MarkdownExporter extends ReportExporter {
    @Override protected String header() {
        return "| item | qty |\n|---|---|\n";
    }
    @Override protected String row(Sale s) {
        return "| " + s.item() + " | " + s.qty() + " |\n";
    }
    @Override protected String footer(int total) {
        return "| total | " + total + " |\n";
    }
}
