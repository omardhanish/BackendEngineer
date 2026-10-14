import java.util.List;

public class CopyPasteExport {
    public static void main(String[] args) {
        List<Sale> sales = List.of(new Sale("pen", 3), new Sale("ink", -1));
        System.out.println(new CsvReport().export(sales));
        System.out.println("--");
        System.out.println(new MarkdownReport().export(sales));
    }
}

record Sale(String item, int qty) {}

final class CsvReport {
    String export(List<Sale> sales) {
        StringBuilder out = new StringBuilder("item,qty\n");
        for (Sale s : sales) {
            if (s.qty() < 0) continue; // drop refunds and bad rows
            out.append(s.item()).append(',').append(s.qty()).append('\n');
        }
        return out.toString().strip();
    }
}

// Copied from CsvReport, then edited. The bad-row check got lost.
final class MarkdownReport {
    String export(List<Sale> sales) {
        StringBuilder out = new StringBuilder("| item | qty |\n|---|---|\n");
        for (Sale s : sales) {
            out.append("| ").append(s.item()).append(" | ")
               .append(s.qty()).append(" |\n");
        }
        return out.toString().strip();
    }
}
