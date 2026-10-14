import java.util.ArrayList;
import java.util.List;

public class ShallowCloneBug {
    public static void main(String[] args) throws Exception {
        Template invoice = new Template("Invoice");
        invoice.addSection("Header");
        invoice.addSection("Line items");

        Template acme = invoice.clone();
        acme.setTitle("Invoice for Acme");
        acme.addSection("Acme discount");

        System.out.println("prototype: " + invoice);
        System.out.println("copy:      " + acme);
        System.out.println("same list? "
                + (invoice.sections() == acme.sections()));
    }
}

class Template implements Cloneable {
    private String title;
    private List<String> sections = new ArrayList<>();

    Template(String title) { this.title = title; }

    void setTitle(String title) { this.title = title; }
    void addSection(String s) { sections.add(s); }
    List<String> sections() { return sections; }

    @Override
    public Template clone() throws CloneNotSupportedException {
        return (Template) super.clone(); // copies fields, not the list
    }

    @Override
    public String toString() { return title + " " + sections; }
}
