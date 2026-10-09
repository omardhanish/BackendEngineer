import java.util.ArrayList;
import java.util.List;

public class PrototypeDemo {
    public static void main(String[] args) {
        Invoice template = Invoice.of("Monthly plan", "Hosting", "Support");

        Invoice march = template.copy();
        march.addLine("Extra storage");
        System.out.println("copy:     " + march);
        System.out.println("template: " + template);

        Invoice april = template.shallowCopy();
        april.addLine("Oops");
        System.out.println("template: " + template);
    }
}

class Invoice {
    private final String title;
    private final List<String> lines;

    private Invoice(String title, List<String> lines) {
        this.title = title;
        this.lines = lines;
    }

    static Invoice of(String title, String... lines) {
        return new Invoice(title, new ArrayList<>(List.of(lines)));
    }

    Invoice copy() { return new Invoice(title, new ArrayList<>(lines)); }

    // The mistake: both objects now share one list.
    Invoice shallowCopy() { return new Invoice(title, lines); }

    void addLine(String line) { lines.add(line); }

    @Override public String toString() { return title + " " + lines; }
}
