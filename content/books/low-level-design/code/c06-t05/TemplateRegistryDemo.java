import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

public class TemplateRegistryDemo {
    public static void main(String[] args) {
        Template invoice = new Template("Invoice", new Style("serif", 11));
        invoice.addSection("Header");
        invoice.addSection("Line items");
        TemplateRegistry registry = new TemplateRegistry();
        registry.register("invoice", invoice);

        Template acme = registry.create("invoice");
        acme.rename("Invoice for Acme");
        acme.addSection("Acme discount");

        System.out.println("prototype: " + registry.create("invoice"));
        System.out.println("copy:      " + acme);
        boolean shared = acme.style() == invoice.style();
        System.out.println("shares style? " + shared);
        try {
            registry.create("memo");
        } catch (IllegalArgumentException e) {
            System.out.println("error: " + e.getMessage());
        }
    }
}

record Style(String font, int size) {} // immutable, so safe to share

final class Template {
    private String title;
    private final Style style;
    private final List<String> sections;

    Template(String title, Style style) {
        this.title = Objects.requireNonNull(title, "title");
        this.style = Objects.requireNonNull(style, "style");
        this.sections = new ArrayList<>();
    }

    private Template(Template src) {            // copy constructor
        this.title = src.title;
        this.style = src.style;                 // immutable: share
        this.sections = new ArrayList<>(src.sections); // mutable: copy
    }

    Template copy() { return new Template(this); }
    void rename(String t) { title = Objects.requireNonNull(t, "title"); }
    void addSection(String s) { sections.add(Objects.requireNonNull(s)); }
    Style style() { return style; }

    @Override
    public String toString() { return title + " " + sections; }
}

final class TemplateRegistry {
    private final Map<String, Template> prototypes = new TreeMap<>();

    void register(String key, Template t) { prototypes.put(key, t.copy()); }

    Template create(String key) {
        Template p = prototypes.get(key);
        if (p == null)
            throw new IllegalArgumentException("no prototype: " + key);
        return p.copy();
    }
}
