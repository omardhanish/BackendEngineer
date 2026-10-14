import java.util.List;

public class SubclassGrid {
    public static void main(String[] args) {
        List<Report> grid = List.of(new CsvInvoiceReport(),
            new CsvStockReport(), new MdInvoiceReport(), new MdStockReport());
        for (Report r : grid) {
            System.out.println("== " + r.getClass().getSimpleName());
            System.out.print(r.render());
        }
    }
}

abstract class Report {
    static final String ITEM = "Desk, oak"; // a comma, on purpose
    abstract String render();
}
// One class per (report x format) pair: 2 x 2 = 4 classes.
final class CsvInvoiceReport extends Report {
    String render() {
        return "item,qty\n\"" + ITEM + "\",2\nTOTAL,2\n";
    }
}
final class CsvStockReport extends Report {
    String render() {                 // copied, and the quoting got lost
        return "sku,on hand\n" + ITEM + ",3 LOW\n";
    }
}
final class MdInvoiceReport extends Report {
    String render() {
        return "| item | qty |\n|-|-|\n| " + ITEM + " | 2 |\n"
            + "| TOTAL | 2 |\n";
    }
}
final class MdStockReport extends Report {
    String render() {
        return "| sku | on hand |\n|-|-|\n| " + ITEM + " | 3 LOW |\n";
    }
}
