import java.util.List;
import java.util.Objects;

public class ReportDemo {
    public static void main(String[] args) {
        List<Report> reports = List.of(
                new SalesReport(List.of(120, 80)),
                new StockReport(3));
        for (Report r : reports) System.out.println(r.render());
        try {
            new StockReport(-1);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

// The type clients depend on: small, no state.
interface Report {
    String render();
}

// Shared state and a fixed skeleton; subclasses fill one step.
abstract class AbstractReport implements Report {
    private final String title;

    protected AbstractReport(String title) {
        this.title = Objects.requireNonNull(title, "title");
    }

    @Override
    public final String render() {
        return "== " + title + " ==\n" + body();
    }

    protected abstract String body();
}

final class SalesReport extends AbstractReport {
    private final List<Integer> sales;
    SalesReport(List<Integer> sales) {
        super("Sales");
        this.sales = List.copyOf(sales);
    }
    @Override protected String body() {
        int total = sales.stream().mapToInt(Integer::intValue).sum();
        return sales.size() + " orders, total " + total;
    }
}

final class StockReport extends AbstractReport {
    private final int lowItems;
    StockReport(int lowItems) {
        super("Stock");
        if (lowItems < 0) throw new IllegalArgumentException("lowItems < 0");
        this.lowItems = lowItems;
    }
    @Override protected String body() { return lowItems + " items low"; }
}
