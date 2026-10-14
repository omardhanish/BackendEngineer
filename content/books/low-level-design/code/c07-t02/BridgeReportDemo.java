import java.util.List;
import java.util.Objects;

public class BridgeReportDemo {
    public static void main(String[] args) {
        var desk = new Line("Desk, oak", 3);
        var lamp = new Line("Lamp", 40);
        Renderer csv = new CsvRenderer(), md = new MarkdownRenderer();
        System.out.print(new InvoiceReport(csv, List.of(desk, lamp)).render());
        System.out.print(new StockReport(csv, List.of(desk, lamp)).render());
        System.out.print(new StockReport(md, List.of(desk, lamp)).render());
    }
}
record Line(String label, int qty) {
    Line { if (qty < 0) throw new IllegalArgumentException("qty < 0"); }
}
// Implementor: HOW to draw. Small, primitive operations only.
interface Renderer {
    String header(String left, String right);
    String row(String left, String right);
}
// Abstraction: WHAT to report. Holds the bridge to a Renderer.
abstract class Report {
    protected final Renderer out;
    protected final List<Line> lines;
    Report(Renderer out, List<Line> lines) {
        this.out = Objects.requireNonNull(out, "renderer");
        this.lines = List.copyOf(lines);
    }
    abstract String render();
}
final class InvoiceReport extends Report {
    InvoiceReport(Renderer out, List<Line> lines) { super(out, lines); }
    String render() {
        var sb = new StringBuilder(out.header("item", "qty"));
        int total = 0;
        for (Line l : lines) {
            sb.append(out.row(l.label(), "" + l.qty()));
            total += l.qty();
        }
        return sb.append(out.row("TOTAL", "" + total)).toString();
    }
}
final class StockReport extends Report {
    StockReport(Renderer out, List<Line> lines) { super(out, lines); }
    String render() {
        var sb = new StringBuilder(out.header("sku", "on hand"));
        for (Line l : lines) {
            String qty = l.qty() < 5 ? l.qty() + " LOW" : "" + l.qty();
            sb.append(out.row(l.label(), qty));
        }
        return sb.toString();
    }
}
final class CsvRenderer implements Renderer {
    public String header(String l, String r) { return row(l, r); }
    public String row(String l, String r) {
        return cell(l) + "," + cell(r) + "\n";
    }
    private static String cell(String s) { // RFC 4180 style quoting
        boolean quote = s.contains(",") || s.contains("\"")
            || s.contains("\n");
        return quote ? "\"" + s.replace("\"", "\"\"") + "\"" : s;
    }
}
final class MarkdownRenderer implements Renderer {
    public String header(String l, String r) { return row(l, r) + "|-|-|\n"; }
    public String row(String l, String r) {
        return "| " + l.replace("|", "\\|") + " | " + r + " |\n";
    }
}
