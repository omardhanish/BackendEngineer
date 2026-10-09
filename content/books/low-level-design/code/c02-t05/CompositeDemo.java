import java.util.ArrayList;
import java.util.List;

public class CompositeDemo {
    public static void main(String[] args) {
        Bundle snacks = new Bundle("snack pack");
        snacks.add(new Product("crisps", 1.5));
        snacks.add(new Product("juice", 2.0));
        Bundle hamper = new Bundle("hamper");
        hamper.add(new Product("cheese", 6.0));
        hamper.add(snacks);
        hamper.print("");
    }
}

interface Item {
    double price();
    void print(String indent);
}

record Product(String name, double price) implements Item {
    public void print(String indent) {
        System.out.println(indent + name + " " + price);
    }
}

class Bundle implements Item {
    private final String name;
    private final List<Item> parts = new ArrayList<>();

    Bundle(String name) { this.name = name; }

    void add(Item part) { parts.add(part); }

    public double price() {
        double sum = 0;
        for (Item part : parts) sum += part.price();
        return sum;
    }

    public void print(String indent) {
        System.out.println(indent + name + " " + price());
        for (Item part : parts) part.print(indent + "  ");
    }
}
